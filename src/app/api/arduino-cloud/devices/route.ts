import { NextResponse } from 'next/server';
import { createArduinoCloudClient } from '@/lib/arduinoCloud';

export async function GET() {
  try {
    // Create Arduino Cloud client
    const client = createArduinoCloudClient();
    
    if (!client) {
      return NextResponse.json(
        { error: 'Failed to create Arduino Cloud client - missing credentials' },
        { status: 500 }
      );
    }

    // Fetch devices from Arduino Cloud
    const devices = await client.getDevices();

    return NextResponse.json({
      success: true,
      devices
    });
  } catch (error) {
    console.error('Error fetching Arduino Cloud devices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch devices from Arduino Cloud' },
      { status: 500 }
    );
  }
} 