import { NextRequest, NextResponse } from "next/server";
import { ArduinoCloudClient } from '@/lib/arduinoCloud';

// Arduino Cloud API credentials from environment variables
const CLIENT_ID = process.env.ARDUINO_CLIENT_ID;
const CLIENT_SECRET = process.env.ARDUINO_CLIENT_SECRET;

// Default Thing ID to use if none is provided
const DEFAULT_THING_ID = process.env.ARDUINO_DEFAULT_THING_ID;

export async function POST(req: NextRequest) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Arduino API credentials are not configured in environment variables.");
    return NextResponse.json(
      { error: "Server configuration error: Missing API credentials." },
      { status: 500 }
    );
  }

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
    
    if (!targetThingId) {
      console.error("Target Thing ID is not configured.");
      return NextResponse.json(
        { error: "Server configuration error: Missing Thing ID." },
        { status: 500 }
      );
    }
    
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
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Arduino API credentials are not configured in environment variables.");
    return NextResponse.json(
      { error: "Server configuration error: Missing API credentials." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const propertyId = url.searchParams.get('propertyId');
    let thingId = url.searchParams.get('thingId') || DEFAULT_THING_ID;

    if (!thingId && (action !== 'listThings' && action !== null)) { // listThings might not require a specific thingId for the client, but others do.
        // If DEFAULT_THING_ID is also null/undefined and it's needed.
        console.error("Thing ID is required for this action and Default Thing ID is not configured.");
        return NextResponse.json(
            { error: "Server configuration error: Missing Thing ID for the requested action." },
            { status: 500 }
        );
    }
    // Ensure thingId is a string if it's set, for ArduinoCloudClient and other uses.
    // If DEFAULT_THING_ID is the source and it's undefined, the earlier check for it (if needed) would have caught it.
    // If no action specified, listThings is default which might not need a thingId for the client.
    // The ArduinoCloudClient will need a valid thingId string.
    
    const effectiveThingId = thingId || DEFAULT_THING_ID; // Fallback if thingId from param is null

    if (!effectiveThingId && (action !== 'listThings' && action !== null && action !== 'getPropertiesForThing' && action !== 'getDeviceInfo')) {
        // Stricter check: if an action other than general listing/info needs a thingId and it's still not resolved.
        // getPropertiesForThing might take an 'id' param or use a default/configured one for the client.
        // getDeviceInfo might also operate on a pre-configured client thingId.
        // For safety, we'll ensure the client is instantiated with a valid thingId.
         console.error("A valid Thing ID is required for client instantiation and the requested action.");
         return NextResponse.json(
             { error: "Server configuration error: A valid Thing ID is unavailable." },
             { status: 500 }
         );
    }
    
    // If effectiveThingId is still undefined here, it implies it's optional for the client or action.
    // However, ArduinoCloudClient constructor in the original code always took a thingId.
    // So, we must ensure effectiveThingId is a string.
    if (!effectiveThingId) {
        console.error("Default Thing ID is not set, and no Thing ID was provided for an operation that requires it.");
        return NextResponse.json(
            { error: "Server configuration error: Default Thing ID is not configured and is required." },
            { status: 500 }
        );
    }


    console.log(`Using Thing ID: ${effectiveThingId}`);
    console.log(`Using credentials: ID=${CLIENT_ID.substring(0, 8)}...`);
    
    // Assuming ArduinoCloudClient expects a non-nullable string for thingId.
    const arduinoClient = new ArduinoCloudClient(CLIENT_ID, CLIENT_SECRET, effectiveThingId);
    
    let result;
    
    if (!action) {
      console.log('No action specified, defaulting to listThings');
      result = await arduinoClient.listThings();
      return NextResponse.json({ 
        success: true, 
        fetchTimestamp: new Date().toISOString(),
        // results: [{ thingId: effectiveThingId }], // Not sure if results should contain thingId like this for listThings
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
        console.log('DIAGNOSTIC: getAllProperties called for thing ID:', effectiveThingId);
        // Assuming getAllDeviceProperties uses the thingId from the client instance
        result = await arduinoClient.getAllDeviceProperties(); 
        
        console.log('DIAGNOSTIC: Properties retrieved:', {
          propertiesData: result,
          // missingConnection: 'Here we get properties but don't store them in the database'
        });
        break;

      case 'getPropertiesForThing':
        // This action seems to imply it can fetch for a *specific* thing ID passed via 'id' param,
        // potentially overriding the client's default.
        // The original ArduinoCloudClient might need to be instantiated per-thing or support overriding.
        // For now, assuming getAllDeviceProperties on the client uses its configured thingId.
        // If a different thingId is passed via 'id', the client might need re-initialization or a different method.
        const directThingIdParam = url.searchParams.get('id');
        if (directThingIdParam) {
            // If your ArduinoCloudClient can take a thingId per call for this:
            // result = await arduinoClient.getAllDeviceProperties(directThingIdParam);
            // Or, if you need a new client instance for a different thing:
            const tempClient = new ArduinoCloudClient(CLIENT_ID, CLIENT_SECRET, directThingIdParam);
            result = await tempClient.getAllDeviceProperties();
            console.log('DIAGNOSTIC: getPropertiesForThing called for specific ID:', directThingIdParam);
        } else {
            // Uses the client's default thingId (effectiveThingId)
            result = await arduinoClient.getAllDeviceProperties();
            console.log('DIAGNOSTIC: getPropertiesForThing called for client default ID:', effectiveThingId);
        }
        break;
        
      case 'getDeviceInfo':
        // Assuming getDeviceInfo uses the thingId from the client instance
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