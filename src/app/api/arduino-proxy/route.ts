import { NextResponse } from 'next/server';
import { createArduinoCloudClient } from '@/lib/arduinoCloud';
import { supabase } from '@/lib/supabase';
import { Device } from '@/lib/supabase';

// Arduino Cloud API credentials
const ARDUINO_CLOUD_CLIENT_ID = process.env.ARDUINO_CLOUD_CLIENT_ID || "9Jw0vR0nlmbiglWl1Xd1WAWKH348vpV4";
const ARDUINO_CLOUD_CLIENT_SECRET = process.env.ARDUINO_CLOUD_CLIENT_SECRET || "JQD5lFjHRRrBkjRP6JN7pxzVYIAqbCLCtwgWoDs78FFzrs2dHEP5CZmhUWTsECNf";

interface DeviceWithPainting extends Device {
  paintings: {
    name: string;
    artist: string;
  };
}

export async function GET() {
  try {
    console.log("Arduino proxy API called");
    
    // Only get devices with arduino_thing_id set
    const { data: devicesWithThingId, error: thingIdError } = await supabase
      .from('devices')
      .select('id, painting_id, arduino_thing_id, paintings(name, artist)')
      .not('arduino_thing_id', 'is', null)
      .limit(5);
    
    if (thingIdError) {
      console.error("Database error fetching devices with Thing ID:", thingIdError);
      return NextResponse.json(
        { error: `Failed to fetch devices with Thing ID: ${thingIdError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Found ${devicesWithThingId?.length || 0} devices with Arduino Thing ID`);
    
    if (!devicesWithThingId || devicesWithThingId.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "No devices with Arduino Thing ID found in the database",
          message: "Please set arduino_thing_id for at least one device in the database" 
        },
        { status: 400 }
      );
    }
    
    // Create Arduino Cloud client using the existing implementation
    const client = createArduinoCloudClient();
    
    if (!client) {
      return NextResponse.json(
        { error: "Failed to create Arduino Cloud client - check environment variables" },
        { status: 500 }
      );
    }
    
    // Process results for each device with a thing ID
    const results = [];
    
    for (const device of devicesWithThingId) {
      const deviceId = device.id;
      const paintingId = device.painting_id;
      const thingId = device.arduino_thing_id;
      
      if (!thingId) {
        console.log(`Skipping device ${deviceId} - no Thing ID`);
        continue;
      }
      
      // Access the painting name using type assertion to bypass TypeScript's type checking
      let paintingName = "Unknown Painting";
      if (device.paintings) {
        // Use type assertion to access the name property safely
        const paintings = device.paintings as any;
        paintingName = paintings.name || paintings[0]?.name || "Unknown Painting";
      }
      
      try {
        // Use the existing implementation to fetch and store data
        const result = await client.fetchAndStoreSensorData(deviceId, thingId);
        
        // Get the properties for the response
        const properties = await client.getDeviceProperties(thingId);
        
        results.push({
          success: true,
          thingId: thingId,
          deviceId: deviceId,
          paintingId: paintingId,
          paintingName: paintingName,
          properties: properties,
          savedData: result
        });
      } catch (deviceError) {
        console.error(`Error processing device ${deviceId} with thing ID ${thingId}:`, deviceError);
        results.push({
          success: false,
          thingId: thingId,
          deviceId: deviceId,
          paintingId: paintingId,
          error: deviceError instanceof Error ? deviceError.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      processedDevices: results.length,
      results
    });
  } catch (error) {
    console.error("Arduino proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 