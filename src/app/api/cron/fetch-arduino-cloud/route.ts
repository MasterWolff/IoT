import { NextResponse } from 'next/server';
import { createArduinoCloudClient } from '@/lib/arduinoCloud';
import { supabase } from '@/lib/supabase';

// This secret should match what you set in your cron job service (e.g. Vercel Cron)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify the request is from our cron job
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('Starting cron job to fetch Arduino Cloud data');
    
    // Create Arduino Cloud client
    const client = createArduinoCloudClient();
    
    if (!client) {
      console.error('Failed to create Arduino Cloud client - missing credentials');
      return NextResponse.json(
        { error: 'Failed to create Arduino Cloud client - missing credentials' },
        { status: 500 }
      );
    }

    // First, get all devices from our database that have Arduino device IDs
    const { data: devices, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .not('arduino_device_id', 'is', null);
      
    if (deviceError) {
      console.error('Error fetching devices from database:', deviceError);
      return NextResponse.json(
        { error: 'Failed to fetch devices from database' },
        { status: 500 }
      );
    }
    
    if (!devices || devices.length === 0) {
      console.log('No devices found with Arduino device IDs');
      return NextResponse.json({
        message: 'No devices found with Arduino device IDs',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`Found ${devices.length} devices with Arduino device IDs`);
    
    // Get all things from Arduino Cloud to map device IDs to thing IDs
    const arduinoDevices = await client.getDevices();
    console.log(`Fetched ${arduinoDevices.length} devices from Arduino Cloud`);
    
    // Create a mapping of device IDs to thing IDs
    const deviceToThingMap = new Map();
    for (const arduinoDevice of arduinoDevices) {
      if (arduinoDevice.id && arduinoDevice.thing_id) {
        deviceToThingMap.set(arduinoDevice.id, arduinoDevice.thing_id);
      }
    }
    
    // Track successful and failed fetches
    const results = {
      success: [] as any[],
      errors: [] as { deviceId: string, error: string }[]
    };

    // Fetch data from all configured Arduino Cloud devices
    await Promise.all(
      devices.map(async (device) => {
        try {
          // Get the Arduino device ID for this device
          const arduinoDeviceId = device.arduino_device_id;
          
          // Get the thing ID for this device ID
          const thingId = deviceToThingMap.get(arduinoDeviceId);
          
          if (!thingId) {
            console.warn(`No thing ID found for Arduino device ID: ${arduinoDeviceId}`);
            results.errors.push({ 
              deviceId: device.id, 
              error: `No thing ID found for Arduino device ID: ${arduinoDeviceId}` 
            });
            return;
          }
          
          console.log(`Fetching data for device ${device.id} with Arduino device ID ${arduinoDeviceId} and thing ID ${thingId}`);
          
          // Fetch and store the sensor data
          const data = await client.fetchAndStoreSensorData(device.id, thingId);
          
          // Update the device's last_measurement timestamp in our database
          const now = new Date().toISOString();
          await supabase
            .from('devices')
            .update({ 
              last_measurement: now,
              updated_at: now
            })
            .eq('id', device.id);
            
          results.success.push({ 
            deviceId: device.id, 
            arduinoDeviceId, 
            thingId, 
            data 
          });
        } catch (error) {
          console.error(`Error fetching data for device ${device.id}:`, error);
          results.errors.push({ 
            deviceId: device.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: devices.length,
      successful: results.success.length,
      failed: results.errors.length,
      results
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute cron job' },
      { status: 500 }
    );
  }
} 