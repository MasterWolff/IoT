import { NextResponse } from 'next/server';
import { createArduinoCloudClient } from '@/lib/arduinoCloud';
import { supabase } from '@/lib/supabase';

// Arduino Cloud API credentials
const ARDUINO_CLOUD_CLIENT_ID = process.env.ARDUINO_CLOUD_CLIENT_ID || "9Jw0vR0nlmbiglWl1Xd1WAWKH348vpV4";
const ARDUINO_CLOUD_CLIENT_SECRET = process.env.ARDUINO_CLOUD_CLIENT_SECRET || "JQD5lFjHRRrBkjRP6JN7pxzVYIAqbCLCtwgWoDs78FFzrs2dHEP5CZmhUWTsECNf";
const ARDUINO_THING_ID = process.env.ARDUINO_THING_ID || "78c2f632-ef2c-4bfe-ad6a-fc18baad480b";

export async function GET() {
  try {
    console.log("Arduino proxy API called");
    
    // Get a device to associate the data with
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('id, painting_id, paintings(name, artist)')
      .limit(1);
    
    if (devicesError) {
      console.error("Database error fetching devices:", devicesError);
      return NextResponse.json(
        { error: `Failed to fetch devices: ${devicesError.message}` },
        { status: 500 }
      );
    }
    
    if (!devices || devices.length === 0) {
      return NextResponse.json(
        { error: "No devices found to associate data with" },
        { status: 400 }
      );
    }
    
    const device = devices[0];
    const deviceId = device.id;
    const paintingId = device.painting_id;
    
    // Access the painting name using type assertion to bypass TypeScript's type checking
    let paintingName = "Unknown Painting";
    if (device.paintings) {
      // Use type assertion to access the name property safely
      const paintings = device.paintings as any;
      paintingName = paintings.name || paintings[0]?.name || "Unknown Painting";
    }
    
    // Create Arduino Cloud client using the existing implementation
    const client = createArduinoCloudClient();
    
    if (!client) {
      return NextResponse.json(
        { error: "Failed to create Arduino Cloud client - check environment variables" },
        { status: 500 }
      );
    }
    
    // Use the existing implementation to fetch and store data
    const result = await client.fetchAndStoreSensorData(deviceId, ARDUINO_THING_ID);
    
    // Get the properties for the response
    const properties = await client.getDeviceProperties(ARDUINO_THING_ID);
    
    return NextResponse.json({
      success: true,
      thingId: ARDUINO_THING_ID,
      deviceId: deviceId,
      paintingId: paintingId,
      paintingName: paintingName,
      properties: properties,
      savedData: result,
      message: "Data fetched and saved using the existing implementation"
    });
  } catch (error) {
    console.error("Arduino proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 