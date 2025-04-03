import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple test endpoint to save Arduino data exactly as it comes from Arduino Cloud
export async function GET() {
  try {
    // Get a device to test with - we don't need arduino_device_id since it doesn't exist
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

    // Sample Arduino data
    const arduinoData = [
      {
        "id": "582c7c90-f8b3-4bf9-8c1a-132284708f8c",
        "name": "airPressure",
        "variable_name": "airPressure",
        "value": 102.47660827636719,
        "last_value": 102.47660827636719,
        "type": "FLOAT",
        "updated_at": "2025-04-03T13:39:29.92Z"
      },
      {
        "id": "abc6e506-35e2-4e69-8306-f5210278a449",
        "name": "co2Concentration",
        "variable_name": "co2Concentration",
        "value": 487,
        "last_value": 487,
        "type": "FLOAT",
        "updated_at": "2025-04-03T13:39:29.92Z"
      },
      {
        "id": "02c99325-cc70-41d3-878f-963634d245d1",
        "name": "humidity",
        "variable_name": "humidity",
        "value": 38.41801071166992,
        "last_value": 38.41801071166992,
        "type": "FLOAT",
        "updated_at": "2025-04-03T13:39:29.92Z"
      },
      {
        "id": "41745355-dde0-428e-9189-cf0828b1c91b",
        "name": "temperature",
        "variable_name": "temperature",
        "value": 19.794137954711914,
        "last_value": 19.794137954711914,
        "type": "FLOAT",
        "updated_at": "2025-04-03T13:39:29.92Z"
      },
      {
        "id": "e1460728-94ed-4cd5-a2aa-71eddf9e7941",
        "name": "moldRiskLevel",
        "variable_name": "moldRiskLevel",
        "value": 0,
        "last_value": 0,
        "type": "INT",
        "updated_at": "2025-04-03T13:01:24.756Z"
      }
    ];

    // Map Arduino data to database schema
    const environmentalData = {
      painting_id: devices[0].painting_id,
      device_id: devices[0].id,
      timestamp: new Date().toISOString(),
      temperature: null as number | null,
      humidity: null as number | null,
      co2concentration: null as number | null,
      airpressure: null as number | null,
      moldrisklevel: null as number | null,
      created_at: new Date().toISOString()
    };
    
    // Apply the mapping
    for (const prop of arduinoData) {
      switch (prop.variable_name) {
        case 'temperature':
          environmentalData.temperature = prop.value;
          break;
        case 'humidity':
          environmentalData.humidity = prop.value;
          break;
        case 'co2Concentration':
          environmentalData.co2concentration = prop.value;
          break;
        case 'airPressure':
          environmentalData.airpressure = prop.value;
          break;
        case 'moldRiskLevel':
          environmentalData.moldrisklevel = prop.value;
          break;
      }
    }
    
    // Save to database
    const { data, error } = await supabase
      .from('environmental_data')
      .insert(environmentalData)
      .select();
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        attempted_data: environmentalData
      }, { status: 500 });
    }
    
    // Also update the device's last_measurement timestamp
    await supabase
      .from('devices')
      .update({ 
        last_measurement: environmentalData.timestamp,
        updated_at: new Date().toISOString()
      })
      .eq('id', devices[0].id);
    
    return NextResponse.json({
      success: true,
      message: "Arduino data saved successfully",
      original_data: arduinoData,
      mapped_data: environmentalData,
      saved_data: data[0]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
} 