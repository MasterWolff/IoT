import { NextResponse } from 'next/server';
import { createArduinoCloudClient } from '@/lib/arduinoCloud';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const deviceId = params.id;
  
  try {
    console.log(`Manual fetch request for device ${deviceId}`);
    
    // Get the device information from the database
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single();
      
    if (deviceError) {
      console.error('Error fetching device from database:', deviceError);
      return NextResponse.json(
        { error: 'Failed to fetch device from database' },
        { status: 500 }
      );
    }
    
    if (!device) {
      console.error(`Device not found: ${deviceId}`);
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }
    
    // Check for Arduino device ID
    if (!device.arduino_device_id) {
      console.error(`No Arduino device ID associated with device: ${deviceId}`);
      return NextResponse.json(
        { error: 'No Arduino device ID associated with this device' },
        { status: 400 }
      );
    }
    
    // Create Arduino Cloud client
    const client = createArduinoCloudClient();
    
    if (!client) {
      console.error('Failed to create Arduino Cloud client - missing credentials');
      return NextResponse.json(
        { error: 'Failed to create Arduino Cloud client - missing credentials' },
        { status: 500 }
      );
    }
    
    // Get all things from Arduino Cloud to find the thing ID
    const arduinoDevices = await client.getDevices();
    
    // Find the matching Arduino device and get its thing ID
    const arduinoDevice = arduinoDevices.find(d => d.id === device.arduino_device_id);
    
    if (!arduinoDevice || !arduinoDevice.thing_id) {
      console.error(`No matching thing ID found for Arduino device ID: ${device.arduino_device_id}`);
      return NextResponse.json(
        { error: 'No matching thing ID found in Arduino Cloud' },
        { status: 404 }
      );
    }
    
    // Fetch and store the sensor data
    console.log(`Fetching data for device ${deviceId} using thing ID ${arduinoDevice.thing_id}`);
    const data = await client.fetchAndStoreSensorData(deviceId, arduinoDevice.thing_id);
    
    // Update the device's last_measurement timestamp in our database
    const now = new Date().toISOString();
    await supabase
      .from('devices')
      .update({ 
        last_measurement: now,
        updated_at: now
      })
      .eq('id', deviceId);
      
    return NextResponse.json({
      success: true,
      message: 'Sensor data fetched and stored successfully',
      deviceId,
      arduinoDeviceId: device.arduino_device_id,
      thingId: arduinoDevice.thing_id,
      data
    });
  } catch (error) {
    console.error(`Error fetching data for device ${deviceId}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sensor data' },
      { status: 500 }
    );
  }
} 