import { NextResponse } from 'next/server';
import { createArduinoCloudClient } from '@/lib/arduinoCloud';

export async function GET(request: Request) {
  try {
    // Get the device ID and thing ID from query parameters
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const thingId = searchParams.get('thingId');
    
    // We need thingId to fetch properties
    if (!thingId) {
      return NextResponse.json(
        { error: 'Thing ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching properties for device ${deviceId} with Thing ID: ${thingId}`);
    
    // Create Arduino Cloud client
    const client = createArduinoCloudClient();
    
    if (!client) {
      return NextResponse.json(
        { error: 'Failed to create Arduino Cloud client - missing credentials' },
        { status: 500 }
      );
    }

    try {
      // Fetch device properties from Arduino Cloud using Thing ID
      console.log(`Making API request to /v1/things/${thingId}/properties`);
      const properties = await client.getDeviceProperties(thingId);
      console.log(`Got ${properties.length} properties`);

      return NextResponse.json({
        success: true,
        deviceId,
        thingId,
        properties
      });
    } catch (error) {
      console.error(`Error fetching properties for Thing ID ${thingId}:`, error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to fetch device properties from Arduino Cloud' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in device-properties route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch device properties from Arduino Cloud' },
      { status: 500 }
    );
  }
} 