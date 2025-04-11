import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapArduinoToDatabaseProperties } from '@/lib/propertyMapper';
import { processEnvironmentalData, AlertRecord } from '@/lib/alertService';

// Store Arduino data with exact column names from the database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Extract Arduino data and device info
    const arduinoData = body.data || [];
    const deviceId = body.device_id;
    const paintingId = body.painting_id;
    
    if (!deviceId || !paintingId || !arduinoData.length) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: device_id, painting_id, and data array"
      }, { status: 400 });
    }
    
    // Map Arduino properties using our standardized mapper
    const sensorValues = mapArduinoToDatabaseProperties(arduinoData);
    
    // Filter out properties that don't exist in our database
    const validColumns = ['temperature', 'humidity', 'co2concentration', 'airpressure', 'moldrisklevel'];
    const filteredValues: Record<string, any> = {};
    
    Object.entries(sensorValues).forEach(([key, value]) => {
      if (validColumns.includes(key)) {
        filteredValues[key] = value;
      } else {
        console.log(`Skipping property ${key} as it doesn't exist in the database`);
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
      console.error('Error saving Arduino data:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        attemptedData: environmentalData
      }, { status: 500 });
    }
    
    // Update the device's last_measurement
    await supabase
      .from('devices')
      .update({ 
        last_measurement: environmentalData.timestamp,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', deviceId);
    
    // Process the new data for alerts immediately using our unified alert service
    let alerts: AlertRecord[] = [];
    
    try {
      console.log('Checking for alerts on new environmental data');
      
      if (data && data.length > 0) {
        // Process environmental data to generate alerts
        alerts = await processEnvironmentalData(data[0]);
        console.log(`Generated ${alerts.length} alerts from new environmental data`);
      }
    } catch (alertError) {
      console.error('Error processing alerts:', alertError);
    }
    
    // Return data with alert information
    return NextResponse.json({
      success: true,
      message: 'Arduino data saved successfully',
      data: data[0],
      alerts: {
        checked: true,
        count: alerts.length,
        hasAlerts: alerts.length > 0,
        alertDetails: alerts
      }
    });
    
  } catch (error) {
    console.error('Error saving Arduino data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Simple GET method for testing - visit this in browser
export async function GET() {
  try {
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