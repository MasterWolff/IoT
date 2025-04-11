import { NextResponse } from 'next/server';
import { 
  ensureAlertsTableExists, 
  getAlerts, 
  updateAlertStatus, 
  processAllEnvironmentalData 
} from '@/lib/alertService';

// GET route - Main alerts endpoint: calculate new alerts and fetch existing ones
export async function GET(request: Request) {
  try {
    // Ensure the alerts table exists
    await ensureAlertsTableExists();
    
    // Parse query parameters
    const url = new URL(request.url);
    const paintingId = url.searchParams.get('paintingId');
    const deviceId = url.searchParams.get('deviceId');
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const calculateNew = url.searchParams.get('calculateNew') === 'true';
    
    let calculatedAlerts = [];
    
    // Calculate new alerts if requested
    if (calculateNew) {
      console.log('Calculating new alerts from environmental data...');
      calculatedAlerts = await processAllEnvironmentalData();
      console.log(`Found ${calculatedAlerts.length} new alerts`);
    }
    
    // Fetch alerts with filters
    const alerts = await getAlerts({
      paintingId: paintingId || undefined,
      deviceId: deviceId || undefined,
      status: status || undefined,
      type: type || undefined
    });
    
    console.log(`Filtering alerts by status: ${status || 'all'}`);
    console.log(`Found ${calculatedAlerts.length} new alerts, ${alerts.length} total alerts in database`);
    
    // Return the alerts
    return NextResponse.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

// PATCH route - Update an alert (e.g., mark as dismissed)
export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.id) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required' },
        { status: 400 }
      );
    }
    
    // Only allow status updates for now
    if (!data.status || !['active', 'dismissed'].includes(data.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    // Update the alert status
    const updated = await updateAlertStatus(data.id, data.status);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update alert' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Alert ${data.id} has been ${data.status}`
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

// For backward compatibility with existing code
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Redirect to GET with appropriate parameters
    const url = new URL(request.url);
    if (body.painting_id) {
      url.searchParams.set('paintingId', body.painting_id);
    }
    if (body.device_id) {
      url.searchParams.set('deviceId', body.device_id);
    }
    
    return GET(new Request(url));
  } catch (error) {
    console.error('Error in POST alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process alert request' },
      { status: 500 }
    );
  }
} 