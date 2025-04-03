import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    
    // Create record with column names that match the database exactly
    const environmentalData = {
      painting_id: paintingId,
      device_id: deviceId,
      timestamp: new Date().toISOString(),
      temperature: null,
      humidity: null,
      airpressure: null,     // Lowercase, no underscore
      co2concentration: null, // Lowercase, no underscore
      moldrisklevel: null,    // Lowercase, no underscore
      created_at: new Date().toISOString()
      // No updated_at column in the database
    };
    
    // Map Arduino property names to database column names
    for (const prop of arduinoData) {
      switch (prop.variable_name) {
        case 'temperature':
          environmentalData.temperature = prop.value;
          break;
        case 'humidity':
          environmentalData.humidity = prop.value;
          break;
        case 'illuminance':
          // Illuminance not in database table, so skip
          break;
        case 'co2Concentration':
          environmentalData.co2concentration = prop.value; // Match database column name
          break;
        case 'airPressure':
          environmentalData.airpressure = prop.value; // Match database column name
          break;
        case 'moldRiskLevel':
          environmentalData.moldrisklevel = prop.value; // Match database column name
          break;
      }
    }
    
    // Insert environmental data
    const { data, error } = await supabase
      .from('environmental_data')
      .insert(environmentalData)
      .select();
    
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
    
    return NextResponse.json({
      success: true,
      message: 'Arduino data saved successfully',
      data: data[0]
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