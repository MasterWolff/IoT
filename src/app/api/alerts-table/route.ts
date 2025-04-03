import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AlertRecord } from '@/lib/supabase';

// Ensure alerts table exists
async function ensureAlertsTableExists() {
  try {
    // Check if alerts table exists by trying to select from it
    const { error } = await supabase
      .from('alerts')
      .select('id')
      .limit(1);

    // If we get a specific error about the table not existing
    if (error && error.code === '42P01') {
      console.log('Alerts table does not exist. Creating it...');
      
      // Create the alerts table using raw SQL
      const { error: sqlError } = await supabase.rpc('run_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS alerts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            painting_id UUID NOT NULL REFERENCES paintings(id),
            device_id UUID REFERENCES devices(id),
            environmental_data_id UUID REFERENCES environmental_data(id),
            alert_type TEXT NOT NULL,
            threshold_exceeded TEXT NOT NULL CHECK (threshold_exceeded IN ('upper', 'lower')),
            measured_value NUMERIC NOT NULL,
            threshold_value NUMERIC NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed')),
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE,
            dismissed_at TIMESTAMP WITH TIME ZONE,
            FOREIGN KEY (painting_id) REFERENCES paintings(id)
          );
          
          -- Add index for faster queries on painting_id
          CREATE INDEX IF NOT EXISTS idx_alerts_painting_id ON alerts(painting_id);
          
          -- Add index for status queries
          CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        `
      });
      
      if (sqlError) {
        console.error('Error creating alerts table:', sqlError);
        
        // Fallback to a simpler table creation without foreign keys if rpc fails
        // This can happen if the run_sql function isn't available or permissions are limited
        const { error: createError } = await supabase
          .from('alerts')
          .insert([{ 
            id: '00000000-0000-0000-0000-000000000000',
            painting_id: '00000000-0000-0000-0000-000000000000',
            alert_type: 'test',
            threshold_exceeded: 'upper',
            measured_value: 0,
            threshold_value: 0,
            status: 'active',
            timestamp: new Date().toISOString()
          }])
          .select();
          
        if (createError) {
          console.error('Failed to create alerts table with fallback method:', createError);
          throw new Error('Could not create alerts table');
        }
      }
    } else if (error) {
      console.error('Error checking alerts table:', error);
    } else {
      console.log('Alerts table exists');
    }
  } catch (err) {
    console.error('Error ensuring alerts table exists:', err);
    throw err;
  }
}

// GET route - get alerts with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Ensure the alerts table exists
    await ensureAlertsTableExists();
    
    // Parse query parameters
    const url = new URL(request.url);
    const paintingId = url.searchParams.get('paintingId');
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Build query
    let query = supabase
      .from('alerts')
      .select('*, paintings(name, artist)')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    // Apply filters if provided
    if (paintingId) {
      query = query.eq('painting_id', paintingId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('alert_type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      count: data.length,
      alerts: data
    });
  } catch (error) {
    console.error('Error in GET alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST route - store a new alert
export async function POST(request: NextRequest) {
  try {
    // Ensure the alerts table exists
    await ensureAlertsTableExists();
    
    // Get the alert data from the request
    const alertData = await request.json();
    
    // Validate required fields
    const requiredFields = ['painting_id', 'alert_type', 'threshold_exceeded', 'measured_value', 'threshold_value', 'timestamp'];
    for (const field of requiredFields) {
      if (!alertData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Add default values for optional fields
    const now = new Date().toISOString();
    const newAlert = {
      ...alertData,
      status: alertData.status || 'active',
      created_at: now
    };
    
    // Insert the alert
    const { data, error } = await supabase
      .from('alerts')
      .insert([newAlert])
      .select();
    
    if (error) {
      console.error('Error creating alert:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Alert created successfully',
      alert: data[0]
    });
  } catch (error) {
    console.error('Error in POST alert:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// PATCH route - update an alert (used for dismissing)
export async function PATCH(request: NextRequest) {
  try {
    // Ensure the alerts table exists
    await ensureAlertsTableExists();
    
    // Get the alert data from the request
    const { id, status } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }
    
    // Update the alert
    const now = new Date().toISOString();
    const updateData: Partial<AlertRecord> = {
      updated_at: now
    };
    
    // Set status and dismissed_at if provided
    if (status === 'dismissed') {
      updateData.status = 'dismissed';
      updateData.dismissed_at = now;
    } else if (status === 'active') {
      updateData.status = 'active';
      updateData.dismissed_at = null;
    }
    
    // Update the alert
    const { data, error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating alert:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Alert updated successfully',
      alert: data[0]
    });
  } catch (error) {
    console.error('Error in PATCH alert:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update alert' },
      { status: 500 }
    );
  }
} 