import { NextRequest, NextResponse } from 'next/server';
import { checkAlertsAndNotify } from '@/lib/api';
import { isEmailConfigured } from '@/lib/emailConfig';
import { supabase } from '@/lib/supabase';
import { sendAlertEmail } from '@/lib/email';
import { emailConfig } from '@/lib/emailConfig';
import { processEnvironmentalData } from '@/lib/alertService';

// Define types for our alerts
interface Alert {
  id: string;
  painting_id: string;
  device_id: string;
  environmental_data_id: string;
  alert_type: string;
  threshold_exceeded: string;
  measured_value: number;
  threshold_value: number;
  material_id: string;
  timestamp: string;
  created_at: string;
  paintings: {
    id: string;
    name: string;
    artist: string;
    [key: string]: any;
  };
  devices: {
    id: string;
    name: string;
    [key: string]: any;
  };
  materials: {
    id: string;
    name: string;
    [key: string]: any;
  };
}

// This route can be called by a cron job to periodically check for alerts
export async function GET(request: NextRequest) {
  // Basic security: check for authorization header
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.warn('CRON_SECRET is not configured, cannot verify authorization');
    return NextResponse.json(
      { error: 'Server is not configured properly for authenticated requests' }, 
      { status: 500 }
    );
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  // Check if email is configured
  if (!isEmailConfigured()) {
    console.error('Email notification system is not properly configured. Missing required values:', {
      host: !!emailConfig.smtp.host,
      port: !!emailConfig.smtp.port,
      user: !!emailConfig.smtp.auth.user,
      pass: !!emailConfig.smtp.auth.pass,
      from: !!emailConfig.from,
      recipients: emailConfig.alertRecipients.length > 0
    });
    return NextResponse.json(
      { error: 'Email notification system is not properly configured.' },
      { status: 500 }
    );
  }
  
  // Log email config (without sensitive data)
  console.log('Email configuration:', {
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    from: emailConfig.from,
    recipients: emailConfig.alertRecipients,
    secure: emailConfig.smtp.secure
  });
  
  try {
    // Use the alerts endpoint to get any active alerts
    const alertsEndpointUrl = new URL('/api/alerts', request.url);
    const alertsResponse = await fetch(alertsEndpointUrl);
    const alertsData = await alertsResponse.json();
    
    // If we have alerts, send emails for each alert group
    if (alertsData.success && alertsData.alerts && alertsData.alerts.length > 0) {
      const alerts: Alert[] = alertsData.alerts;
      
      // Group alerts by painting for better notification organization
      const alertsByPainting: Record<string, Alert[]> = {};
      alerts.forEach((alert: Alert) => {
        const paintingId = alert.painting_id;
        if (!alertsByPainting[paintingId]) {
          alertsByPainting[paintingId] = [];
        }
        alertsByPainting[paintingId].push(alert);
      });
      
      // Send one email per painting with all of its alerts
      for (const paintingId in alertsByPainting) {
        const paintingAlerts = alertsByPainting[paintingId];
        const painting = paintingAlerts[0].paintings;
        
        // Format the alerts for the email
        const alertsText = paintingAlerts.map((alert: Alert) => {
          // Add extra logging for CO2 alerts to debug the issue
          if (alert.alert_type === 'co2' || alert.alert_type === 'co2concentration') {
            console.log('CO2 Alert Details:', {
              alertType: alert.alert_type,
              value: alert.measured_value,
              threshold: alert.threshold_value,
              timestamp: alert.timestamp
            });
          }
          
          const alertType = alert.alert_type === 'moldRiskLevel' ? 'Mold Risk' : 
                            alert.alert_type === 'illuminance' ? 'Light Level' : 
                            alert.alert_type === 'co2' || alert.alert_type === 'co2concentration' ? 'CO₂' :
                            alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1);
          
          // Special formatting for mold risk
          if (alert.alert_type === 'moldRiskLevel' || alert.alert_type === 'mold_risk_level') {
            return `${alertType}: High (Level ${alert.measured_value})`;
          }
          
          return `${alertType}: ${alert.measured_value} (Threshold ${alert.threshold_exceeded === 'upper' ? 'exceeded' : 'below'} ${alert.threshold_value})`;
        }).join('\n');
        
        // Send the alert email
        try {
          console.log(`Attempting to send email alert for ${painting.name} to ${emailConfig.alertRecipients.join(',')}`);
          
          // Use the API-based approach for consistency
          const firstAlert = paintingAlerts[0];
          
          // Map alert type to proper measurement type
          let measurementType: any = firstAlert.alert_type;
          if (firstAlert.alert_type === 'co2') measurementType = 'co2';
          if (firstAlert.alert_type === 'temperature') measurementType = 'temperature';
          if (firstAlert.alert_type === 'humidity') measurementType = 'humidity';
          if (firstAlert.alert_type === 'mold_risk_level') measurementType = 'mold_risk_level';
          if (firstAlert.alert_type === 'illuminance') measurementType = 'illuminance';
          
          // Determine unit based on measurement type
          let unit = '';
          switch (measurementType) {
            case 'temperature': unit = '°C'; break;
            case 'humidity': unit = '%'; break;
            case 'co2': unit = 'ppm'; break;
            case 'illuminance': unit = 'lux'; break;
            case 'mold_risk_level': unit = 'level'; break;
            default: unit = ''; break;
          }
          
          // Create thresholds object
          const thresholds = {
            lower: firstAlert.threshold_exceeded === 'lower' ? firstAlert.threshold_value : null,
            upper: firstAlert.threshold_exceeded === 'upper' ? firstAlert.threshold_value : null,
          };
          
          // Use this more consistent API-based approach
          const sendEmailResponse = await fetch(new URL('/api/send-email', request.url).toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              alert: {
                id: firstAlert.id,
                paintingId: firstAlert.painting_id,
                paintingName: painting.name,
                artist: painting.artist,
                measurement: {
                  type: measurementType,
                  value: firstAlert.measured_value,
                  unit: unit
                },
                threshold: thresholds,
                timestamp: firstAlert.timestamp
              }
            })
          });
          
          const emailResult = await sendEmailResponse.json();
          
          if (emailResult.success) {
            console.log(`Alert email sent for ${painting.name}`);
          } else {
            console.error(`Failed to send alert email for ${painting.name}: ${emailResult.error}`);
          }
        } catch (emailError) {
          console.error(`Failed to send alert email for ${painting.name}:`, emailError);
        }
      }
    }
    
    return NextResponse.json(alertsData);
  } catch (error) {
    console.error('Error checking alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check alerts' },
      { status: 500 }
    );
  }
}

// POST - Process alerts for a specific environmental data point
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // If specific environmental data ID provided, get that data point
    if (body.environmentalDataId) {
      // First check if this data point already has alerts to avoid duplicates
      const { data: existingAlerts, error: existingError } = await supabase
        .from('alerts')
        .select('id')
        .eq('environmental_data_id', body.environmentalDataId);
      
      if (existingError) {
        console.error('Error checking for existing alerts:', existingError);
      } else if (existingAlerts && existingAlerts.length > 0) {
        console.log(`Environmental data point ${body.environmentalDataId} already has ${existingAlerts.length} alerts. Skipping processing.`);
        
        // Return the existing alerts instead of creating new ones
        const { data: alerts, error: getError } = await supabase
          .from('alerts')
          .select('*')
          .eq('environmental_data_id', body.environmentalDataId);
          
        if (getError) {
          console.error('Error fetching existing alerts:', getError);
        } else {
          return NextResponse.json({
            success: true,
            alerts: alerts || [],
            message: 'Using existing alerts, no new alerts created'
          });
        }
      }
    
      // Fetch the environmental data with painting details
      const { data: envData, error: envError } = await supabase
        .from('environmental_data')
        .select('*, paintings(*, painting_materials(materials(*)))')
        .eq('id', body.environmentalDataId)
        .single();
      
      if (envError) {
        console.error('Error fetching environmental data:', envError);
        return NextResponse.json(
          { error: envError.message },
          { status: 500 }
        );
      }
      
      // Process the environmental data and create alerts
      console.log('Processing environmental data for alerts:', body.environmentalDataId);
      const createdAlerts = await processEnvironmentalData(envData);
      console.log(`Created ${createdAlerts.length} alerts for environmental data ${body.environmentalDataId}`);
      
      // If alerts were created, send email notifications
      if (createdAlerts.length > 0) {
        console.log('Sending email notifications for new alerts...');
        const painting = envData.paintings;
        
        // Process each alert for notification
        for (const alert of createdAlerts) {
          try {
            // Map alert type to proper measurement type
            let measurementType: any = alert.alert_type;
            if (alert.alert_type === 'co2') measurementType = 'co2';
            if (alert.alert_type === 'temperature') measurementType = 'temperature';
            if (alert.alert_type === 'humidity') measurementType = 'humidity';
            if (alert.alert_type === 'mold_risk_level') measurementType = 'mold_risk_level';
            if (alert.alert_type === 'illuminance') measurementType = 'illuminance';
            
            // Determine unit based on measurement type
            let unit = '';
            switch (measurementType) {
              case 'temperature': unit = '°C'; break;
              case 'humidity': unit = '%'; break;
              case 'co2': unit = 'ppm'; break;
              case 'illuminance': unit = 'lux'; break;
              case 'mold_risk_level': unit = 'level'; break;
              default: unit = ''; break;
            }
            
            // Create thresholds object
            const thresholds = {
              lower: alert.threshold_exceeded === 'lower' ? alert.threshold_value : null,
              upper: alert.threshold_exceeded === 'upper' ? alert.threshold_value : null,
            };
            
            // Use this:
            const sendEmailResponse = await fetch(new URL('/api/send-email', request.url).toString(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                alert: {
                  id: alert.id,
                  paintingId: alert.painting_id,
                  paintingName: painting.name,
                  artist: painting.artist,
                  measurement: {
                    type: measurementType,
                    value: alert.measured_value,
                    unit: unit
                  },
                  threshold: thresholds,
                  timestamp: alert.timestamp
                }
              })
            });
            
            const emailResult = await sendEmailResponse.json();
            const emailSent = emailResult.success;
            
            console.log(`Email notification ${emailSent ? 'sent' : 'failed'} for alert type ${alert.alert_type}`);
          } catch (emailError) {
            console.error(`Error sending email notification for alert ${alert.id}:`, emailError);
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        alerts: createdAlerts,
        alertsCount: createdAlerts.length,
        message: createdAlerts.length > 0 ? 'Alerts created and notifications sent' : 'No alerts created'
      });
    } else {
      // If no specific data point ID provided, use the general alert check mechanism
      const result = await checkAlertsAndNotify();
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error in POST /api/check-alerts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 