import { NextRequest, NextResponse } from "next/server";
import { ArduinoCloudClient } from '@/lib/arduinoCloud';

// Arduino Cloud API credentials directly from environment
const CLIENT_ID = "9Jw0vR0nlmbiglWl1Xd1WAWKH348vpV4";
const CLIENT_SECRET = "JQD5lFjHRRrBkjRP6JN7pxzVYIAqbCLCtwgWoDs78FFzrs2dHEP5CZmhUWTsECNf";

// Default Thing ID to use if none is provided
const DEFAULT_THING_ID = "78c2f632-ef2c-4bfe-ad6a-fc18baad480b";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, value, thingId } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }
    
    // Use the provided Thing ID or fall back to the default
    const targetThingId = thingId || DEFAULT_THING_ID;
    
    const arduinoClient = new ArduinoCloudClient(CLIENT_ID, CLIENT_SECRET, targetThingId);
    const result = await arduinoClient.updateDeviceProperty(propertyId, value);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error updating Arduino property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update property" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const propertyId = url.searchParams.get('propertyId');
    const thingId = url.searchParams.get('thingId') || DEFAULT_THING_ID;

    console.log(`Using Thing ID: ${thingId}`);
    console.log(`Using credentials: ID=${CLIENT_ID.substring(0, 8)}...`);
    
    const arduinoClient = new ArduinoCloudClient(CLIENT_ID, CLIENT_SECRET, thingId);
    
    let result;
    
    // If no action is specified, default to listing things
    if (!action) {
      console.log('No action specified, defaulting to listThings');
      result = await arduinoClient.listThings();
      return NextResponse.json({ 
        success: true, 
        fetchTimestamp: new Date().toISOString(),
        results: [{ thingId }],
        result 
      });
    }
    
    switch (action) {
      case 'getProperty':
        if (!propertyId) {
          return NextResponse.json(
            { error: "Property ID is required for getProperty action" },
            { status: 400 }
          );
        }
        result = await arduinoClient.getDeviceProperty(propertyId);
        break;
        
      case 'getAllProperties':
        result = await arduinoClient.getAllDeviceProperties();
        break;

      // New action to exactly match Postman call format  
      case 'getPropertiesForThing':
        // Direct thing ID in format matching Postman
        const directThingId = url.searchParams.get('id');
        if (directThingId) {
          result = await arduinoClient.getAllDeviceProperties(directThingId);
        } else {
          result = await arduinoClient.getAllDeviceProperties();
        }
        break;
        
      case 'getDeviceInfo':
        result = await arduinoClient.getDeviceInfo();
        break;
        
      case 'listThings':
        result = await arduinoClient.listThings();
        break;
        
      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error accessing Arduino Cloud:", error);
    return NextResponse.json(
      { error: error.message || "Failed to access Arduino Cloud" },
      { status: 500 }
    );
  }
} 