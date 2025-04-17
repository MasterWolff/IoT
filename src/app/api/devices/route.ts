import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all devices
export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const paintingId = searchParams.get('paintingId');
    const status = searchParams.get('status');
    const arduinoId = searchParams.get('arduinoId'); // Get Arduino thing ID from query params
    
    console.log('DEVICES API REQUEST:', {
      paintingId,
      status,
      arduinoId,
      url: request.url
    });
    
    // Start building the query
    let query = supabase
      .from('devices')
      .select('*, paintings(*)');
    
    // Apply filters if provided
    if (paintingId) {
      query = query.eq('painting_id', paintingId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // If Arduino thing ID is provided, search for it specifically
    if (arduinoId) {
      query = query.eq('arduino_thing_id', arduinoId);
      console.log(`Looking for device with arduino_thing_id = ${arduinoId}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching devices:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Log the results for debugging
    console.log('DEVICES API RESPONSE:', {
      deviceCount: data.length,
      hasArduinoId: !!arduinoId,
      arduinoId,
      foundMatches: data.map(d => ({
        id: d.id,
        name: d.name,
        arduino_thing_id: d.arduino_thing_id,
        painting_id: d.painting_id
      }))
    });
    
    return NextResponse.json({
      success: true,
      count: data.length,
      devices: data
    });
  } catch (error) {
    console.error('Error in devices API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

// POST to create a new device
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.painting_id) {
      return NextResponse.json(
        { error: 'Name and painting_id are required fields' },
        { status: 400 }
      );
    }
    
    // Prepare data with timestamps
    const device = {
      name: body.name,
      painting_id: body.painting_id,
      status: body.status || 'inactive',
      last_calibration_date: body.last_calibration_date || null,
      last_measurement: body.last_measurement || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the device
    const { data, error } = await supabase
      .from('devices')
      .insert(device)
      .select();
    
    if (error) {
      console.error('Error creating device:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      device: data[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error in create device API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create device' },
      { status: 500 }
    );
  }
} 