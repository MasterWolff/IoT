import { NextRequest, NextResponse } from 'next/server';
import { checkAlertsAndNotify } from '@/lib/api';
import { isEmailConfigured } from '@/lib/emailConfig';
import { supabase } from '@/lib/supabase';
import { sendAlertEmail } from '@/lib/email';
import { emailConfig } from '@/lib/emailConfig';

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
          const alertType = alert.alert_type === 'moldRiskLevel' ? 'Mold Risk' : 
                            alert.alert_type === 'illuminance' ? 'Light Level' : 
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
          await sendAlertEmail({
            to: emailConfig.alertRecipients.join(','), // Use configured recipients
            subject: `Environmental Alert for ${painting.name}`,
            text: `The following environmental alerts have been detected for ${painting.name} by ${painting.artist}:\n\n${alertsText}`,
            html: `
              <h2>Environmental Alert for ${painting.name}</h2>
              <p>The following environmental alerts have been detected for <strong>${painting.name}</strong> by <strong>${painting.artist}</strong>:</p>
              <ul>
                ${paintingAlerts.map((alert: Alert) => {
                  const alertType = alert.alert_type === 'moldRiskLevel' ? 'Mold Risk' : 
                                    alert.alert_type === 'illuminance' ? 'Light Level' : 
                                    alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1);
                  
                  // Special formatting for mold risk
                  if (alert.alert_type === 'moldRiskLevel' || alert.alert_type === 'mold_risk_level') {
                    return `<li><strong>${alertType}:</strong> High (Level ${alert.measured_value})</li>`;
                  }
                  
                  return `<li><strong>${alertType}:</strong> ${alert.measured_value} (Threshold ${alert.threshold_exceeded === 'upper' ? 'exceeded' : 'below'} ${alert.threshold_value})</li>`;
                }).join('')}
              </ul>
              <p>Please check the environmental conditions in the gallery immediately.</p>
            `
          });
          
          console.log(`Alert email sent for ${painting.name}`);
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
      
      // Use the alerts API to check this data point
      const alertsEndpointUrl = new URL('/api/alerts', request.url);
      alertsEndpointUrl.searchParams.set('paintingId', envData.painting_id);
      const alertsResponse = await fetch(alertsEndpointUrl);
      const alertsData = await alertsResponse.json();
      
      // If we have alerts, send emails
      if (alertsData.success && alertsData.alerts && alertsData.alerts.length > 0) {
        const alertsForThisDataPoint = alertsData.alerts.filter(
          (alert: Alert) => alert.environmental_data_id === body.environmentalDataId
        );
        
        if (alertsForThisDataPoint.length > 0) {
          const painting = envData.paintings;
          
          // Format the alerts for the email
          const alertsText = alertsForThisDataPoint.map((alert: Alert) => {
            const alertType = alert.alert_type === 'moldRiskLevel' ? 'Mold Risk' : 
                              alert.alert_type === 'illuminance' ? 'Light Level' : 
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
            await sendAlertEmail({
              to: emailConfig.alertRecipients.join(','), // Use configured recipients
              subject: `Environmental Alert for ${painting.name}`,
              text: `The following environmental alerts have been detected for ${painting.name} by ${painting.artist}:\n\n${alertsText}`,
              html: `
                <h2>Environmental Alert for ${painting.name}</h2>
                <p>The following environmental alerts have been detected for <strong>${painting.name}</strong> by <strong>${painting.artist}</strong>:</p>
                <ul>
                  ${alertsForThisDataPoint.map((alert: Alert) => {
                    const alertType = alert.alert_type === 'moldRiskLevel' ? 'Mold Risk' : 
                                      alert.alert_type === 'illuminance' ? 'Light Level' : 
                                      alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1);
                    
                    // Special formatting for mold risk
                    if (alert.alert_type === 'moldRiskLevel' || alert.alert_type === 'mold_risk_level') {
                      return `<li><strong>${alertType}:</strong> High (Level ${alert.measured_value})</li>`;
                    }
                    
                    return `<li><strong>${alertType}:</strong> ${alert.measured_value} (Threshold ${alert.threshold_exceeded === 'upper' ? 'exceeded' : 'below'} ${alert.threshold_value})</li>`;
                  }).join('')}
                </ul>
                <p>Please check the environmental conditions in the gallery immediately.</p>
              `
            });
            
            console.log(`Alert email sent for ${painting.name}`);
          } catch (emailError) {
            console.error(`Failed to send alert email for ${painting.name}:`, emailError);
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        alerts: alertsData.alerts.filter(
          (alert: Alert) => alert.environmental_data_id === body.environmentalDataId
        )
      });
    } else {
      // If no specific data point, check all alerts (similar to GET)
      return GET(request);
    }
  } catch (error) {
    console.error('Error processing alert check:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process alert check' },
      { status: 500 }
    );
  }
} 