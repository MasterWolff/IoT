import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapArduinoToDatabaseProperties } from '@/lib/propertyMapper';
import { processEnvironmentalData, AlertRecord } from '@/lib/alertService';
import { checkAlertsAndNotify } from '@/lib/api';
import { sendAlertEmail } from '@/lib/email';

// Store Arduino data with exact column names from the database
export async function POST(request: Request) {
  try {
    console.log('📥 STORE-ARDUINO: POST endpoint called');
    
    // Log the raw request details
    const requestUrl = request.url;
    const method = request.method;
    const headers = Object.fromEntries([...request.headers.entries()]);
    
    console.log('📋 STORE-ARDUINO REQUEST DETAILS:', { 
      url: requestUrl,
      method,
      contentType: headers['content-type']
    });
    
    const body = await request.json();
    
    // Log the incoming data structure
    console.log('📦 STORE-ARDUINO: Received data structure:', {
      hasDeviceId: !!body.device_id,
      deviceId: body.device_id,
      hasPaintingId: !!body.painting_id,
      paintingId: body.painting_id,
      dataLength: body.data?.length || 0,
      dataPreview: body.data?.slice(0, 3),
      requestBody: body
    });
    
    // Extract Arduino data and device info
    const arduinoData = body.data || [];
    const deviceId = body.device_id;
    const paintingId = body.painting_id;
    
    if (!deviceId || !paintingId || !arduinoData.length) {
      console.error('❌ STORE-ARDUINO: Missing required fields:', {
        deviceId: deviceId || 'MISSING',
        paintingId: paintingId || 'MISSING',
        dataLength: arduinoData.length
      });
      
      return NextResponse.json({
        success: false,
        error: "Missing required fields: device_id, painting_id, and data array"
      }, { status: 400 });
    }
    
    // Map Arduino properties using our standardized mapper
    const sensorValues = mapArduinoToDatabaseProperties(arduinoData);
    console.log('🔄 STORE-ARDUINO: Mapped sensor values:', sensorValues);
    
    // Filter out properties that don't exist in our database
    const validColumns = ['temperature', 'humidity', 'co2concentration', 'airpressure', 'moldrisklevel', 'illuminance'];
    const filteredValues: Record<string, any> = {};
    
    Object.entries(sensorValues).forEach(([key, value]) => {
      if (validColumns.includes(key)) {
        filteredValues[key] = value;
      } else {
        console.log(`🚫 STORE-ARDUINO: Skipping property ${key} as it doesn't exist in the database`);
      }
    });
    
    // Create record with proper database field names
    const environmentalData = {
      painting_id: paintingId,
      device_id: deviceId,
      timestamp: new Date().toISOString(),
      ...filteredValues,
      created_at: new Date().toISOString()
    };
    
    console.log('💾 STORE-ARDUINO: Attempting to insert data:', environmentalData);
    
    // Add database schema debugging
    try {
      const { data: tableInfo, error: describeError } = await supabase
        .from('devices')
        .select('*')
        .limit(1);
      
      if (describeError) {
        console.warn('⚠️ STORE-ARDUINO: Error checking devices schema:', describeError);
      } else {
        console.log('ℹ️ STORE-ARDUINO: First device sample:', tableInfo);
      }
    } catch (schemaError) {
      console.warn('⚠️ STORE-ARDUINO: Schema check error:', schemaError);
    }
    
    // Insert environmental data
    const { data, error } = await supabase
      .from('environmental_data')
      .insert(environmentalData)
      .select(`
        *,
        paintings(
          id, 
          name, 
          artist,
          painting_materials(
            materials(*)
          )
        )
      `);
    
    if (error) {
      console.error('❌ STORE-ARDUINO: Error saving Arduino data:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        attemptedData: environmentalData
      }, { status: 500 });
    }
    
    // Log successful data storage in a very prominent way
    console.log('');
    console.log('✅✅✅ ENVIRONMENTAL DATA STORED SUCCESSFULLY ✅✅✅');
    console.log(`📊 New data point ID: ${data[0].id}`);
    console.log(`🖼️ Painting: ${data[0].paintings?.name || 'Unknown'} (${data[0].painting_id})`);
    console.log(`⚙️ Device: ${deviceId}`);
    console.log(`🕒 Timestamp: ${data[0].timestamp}`);
    console.log('');
    
    // Log the data details
    console.log('✅ STORE-ARDUINO: Successfully stored environmental data', {
      device_id: environmentalData.device_id,
      painting_id: environmentalData.painting_id,
      timestamp: environmentalData.timestamp,
      data: data && data.length > 0 ? data[0] : null,
      data_saved: true
    });
    
    // Update the device's last_measurement
    console.log('🔄 STORE-ARDUINO: Updating device last_measurement');
    const { error: deviceUpdateError } = await supabase
      .from('devices')
      .update({ 
        last_measurement: environmentalData.timestamp,
        updated_at: new Date().toISOString()
      })
      .eq('id', deviceId);
      
    if (deviceUpdateError) {
      console.warn('⚠️ STORE-ARDUINO: Error updating device last_measurement:', deviceUpdateError);
    } else {
      console.log('✅ STORE-ARDUINO: Successfully updated device last_measurement');
    }
    
    // Process environmental data to generate alerts
    let alerts: AlertRecord[] = [];
    
    try {
      console.log('🔔 STORE-ARDUINO: Checking for alerts on new environmental data');
      
      // Initialize emailAlerts
      let emailAlerts = {
        checked: false,
        emailsSent: 0,
        alertsCount: 0
      };
      
      if (data && data.length > 0) {
        // First, get painting details for email notifications
        const { data: paintingData, error: paintingError } = await supabase
          .from('paintings')
          .select('id, name, artist')
          .eq('id', data[0].painting_id)
          .single();
          
        if (paintingError) {
          console.error('❌ STORE-ARDUINO: Error fetching painting details:', paintingError);
        }
        
        // Process environmental data to generate alerts
        alerts = await processEnvironmentalData(data[0]);
        console.log(`🔔 STORE-ARDUINO: Generated ${alerts.length} alerts from new environmental data`);
        
        // If we have alerts and painting data, send emails directly
        if (alerts.length > 0 && paintingData) {
          const sentEmails = await processAlertsAndSendEmails(alerts, paintingData);
          console.log(`🔔 STORE-ARDUINO: Sent ${sentEmails} email notifications for alerts`);
          
          emailAlerts = {
            checked: true,
            emailsSent: sentEmails,
            alertsCount: alerts.length
          };
        } else {
          // Fallback to general alert checking
          const result = await checkAlertsAndNotify();
          
          if (result.success) {
            emailAlerts = {
              checked: true,
              emailsSent: result.emailsSent || 0,
              alertsCount: result.alertsCount || 0
            };
            console.log(`🔔 STORE-ARDUINO: Email alert check complete - ${emailAlerts.emailsSent} emails sent`);
          } else {
            console.error('❌ STORE-ARDUINO: Alert check failed:', result.error);
          }
        }
      }
      
      // Return data with alert information
      return NextResponse.json({
        success: true,
        message: 'Arduino data saved successfully',
        data: data && data.length > 0 ? data[0] : null,
        alerts: {
          checked: true,
          count: alerts.length,
          hasAlerts: alerts.length > 0,
          alertDetails: alerts
        },
        emailAlerts
      });
      
    } catch (alertError) {
      console.error('❌ STORE-ARDUINO: Error processing alerts:', alertError);
    }
    
  } catch (error) {
    console.error('❌ STORE-ARDUINO: Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Simple GET method for testing - visit this in browser
export async function GET() {
  try {
    console.log('DIAGNOSTIC: store-arduino GET endpoint was called (test function)');
    
    // Get a device to associate data with
    const { data: devices } = await supabase
      .from('devices')
      .select('id, painting_id')
      .limit(1);
    
    if (!devices || devices.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No devices found to test with"
      }, { status: 400 });
    }

    // Create request with sample data
    const testBody = {
      device_id: devices[0].id,
      painting_id: devices[0].painting_id,
      data: [
        {
          "variable_name": "temperature",
          "value": 19.8
        },
        {
          "variable_name": "humidity",
          "value": 38.4
        },
        {
          "variable_name": "co2Concentration", 
          "value": 487
        },
        {
          "variable_name": "airPressure",
          "value": 102.5
        },
        {
          "variable_name": "moldRiskLevel",
          "value": 0
        }
      ]
    };
    
    // Call POST handler
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBody)
    });
    
    return POST(request);
  } catch (error) {
    console.error('Error in test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}

// Process alerts and send emails for generated alerts
async function processAlertsAndSendEmails(alerts: any[], painting: any) {
  if (!alerts || alerts.length === 0 || !painting) {
    console.log('No alerts to process for email notifications');
    return 0;
  }
  
  console.log(`🔔 STORE-ARDUINO: Processing ${alerts.length} alerts for email notifications`);
  let emailsSent = 0;
  
  for (const alert of alerts) {
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
      
      console.log('🔔 STORE-ARDUINO: Directly calling sendAlertEmail for immediate email delivery');
      
      // Create alert info object
      const alertInfo = {
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
      };
      
      // Send email directly using the server-side email service
      const emailSent = await sendAlertEmail(alertInfo);
      
      if (emailSent) {
        emailsSent++;
        console.log(`✅ STORE-ARDUINO: Successfully sent email alert for ${painting.name} (${alert.alert_type})`);
      } else {
        console.warn(`⚠️ STORE-ARDUINO: Failed to send email alert for ${painting.name} (${alert.alert_type})`);
      }
    } catch (error) {
      console.error(`❌ STORE-ARDUINO: Error sending email for alert:`, error);
    }
  }
  
  return emailsSent;
} 