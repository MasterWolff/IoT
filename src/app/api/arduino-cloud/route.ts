import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Arduino Cloud API credentials
const ARDUINO_CLOUD_API_URL = process.env.ARDUINO_CLOUD_API_URL;
const ARDUINO_CLOUD_CLIENT_ID = process.env.ARDUINO_CLOUD_CLIENT_ID;
const ARDUINO_CLOUD_CLIENT_SECRET = process.env.ARDUINO_CLOUD_CLIENT_SECRET;

// Function to fetch data from Arduino Cloud
export async function GET() {
  try {
    // Validate Arduino Cloud credentials
    if (!ARDUINO_CLOUD_API_URL || !ARDUINO_CLOUD_CLIENT_ID || !ARDUINO_CLOUD_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Arduino Cloud API credentials are not configured' },
        { status: 500 }
      );
    }

    // Get our devices from the database
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('id, arduino_device_id, painting_id')
      .not('arduino_device_id', 'is', null);

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      );
    }

    if (!devices || devices.length === 0) {
      return NextResponse.json(
        { error: 'No devices with Arduino Cloud IDs found' },
        { status: 400 }
      );
    }

    // Fetch access token from Arduino Cloud
    const tokenResponse = await fetch(`${ARDUINO_CLOUD_API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${ARDUINO_CLOUD_CLIENT_ID}:${ARDUINO_CLOUD_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to get Arduino Cloud token:', errorText);
      return NextResponse.json(
        { error: 'Failed to authenticate with Arduino Cloud' },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Process each device
    const results = [];
    for (const device of devices) {
      // Skip devices without Arduino Cloud ID
      if (!device.arduino_device_id) continue;

      // Fetch properties from Arduino Cloud
      const propertiesResponse = await fetch(`${ARDUINO_CLOUD_API_URL}/devices/${device.arduino_device_id}/properties`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!propertiesResponse.ok) {
        console.error(`Failed to fetch properties for device ${device.arduino_device_id}:`, await propertiesResponse.text());
        continue;
      }

      const properties = await propertiesResponse.json();
      
      // Transform Arduino Cloud data to our database schema
      const transformedData = {
        painting_id: device.painting_id,
        device_id: device.id,
        timestamp: new Date().toISOString(),
        temperature: null,
        humidity: null,
        co2concentration: null,
        airpressure: null,
        moldrisklevel: null,
        created_at: new Date().toISOString()
      };

      // Map Arduino Cloud properties to our schema
      for (const prop of properties) {
        switch (prop.variable_name) {
          case 'temperature':
            transformedData.temperature = prop.value;
            break;
          case 'humidity':
            transformedData.humidity = prop.value;
            break;
          case 'illuminance':
            break;
          case 'co2Concentration':
            transformedData.co2concentration = prop.value;
            break;
          case 'airPressure':
            transformedData.airpressure = prop.value;
            break;
          case 'moldRiskLevel':
            transformedData.moldrisklevel = prop.value;
            break;
        }
      }

      // Insert the data into our database
      const { data: insertedData, error: insertError } = await supabase
        .from('environmental_data')
        .insert(transformedData)
        .select();

      if (insertError) {
        console.error('Error inserting environmental data:', insertError);
        continue;
      }

      // Update the device's last_measurement timestamp
      await supabase
        .from('devices')
        .update({
          last_measurement: transformedData.timestamp,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', device.id);

      results.push({
        device_id: device.id,
        arduino_device_id: device.arduino_device_id,
        data: insertedData[0]
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching Arduino Cloud data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Arduino Cloud data' },
      { status: 500 }
    );
  }
} 