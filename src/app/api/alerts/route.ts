import { NextResponse } from 'next/server';
import { supabase, AlertRecord } from '@/lib/supabase';
import { PROPERTY_MAPPINGS } from '@/lib/propertyMapper';

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
        throw new Error('Could not create alerts table');
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

// Store a newly calculated alert in the database
async function storeAlertRecord(alert: any) {
  try {
    // Check if this alert already exists to avoid duplicates
    const { data: existingAlerts, error: checkError } = await supabase
      .from('alerts')
      .select('id')
      .eq('painting_id', alert.painting_id)
      .eq('alert_type', alert.alert_type)
      .eq('threshold_exceeded', alert.threshold_exceeded)
      .eq('status', 'active');
    
    if (checkError) {
      console.error('Error checking for existing alerts:', checkError);
      return;
    }
    
    if (existingAlerts && existingAlerts.length > 0) {
      console.log(`Alert already exists for painting ${alert.painting_id} with type ${alert.alert_type}`);
      return existingAlerts[0]; // Return existing alert
    }
    
    // Format the alert for insertion
    const alertRecord: Partial<AlertRecord> = {
      painting_id: alert.painting_id,
      device_id: alert.device_id,
      environmental_data_id: alert.environmental_data_id,
      alert_type: alert.alert_type,
      threshold_exceeded: alert.threshold_exceeded,
      measured_value: alert.measured_value,
      threshold_value: alert.threshold_value,
      status: 'active',
      timestamp: alert.timestamp || new Date().toISOString()
    };
    
    console.log('Storing alert in database:', JSON.stringify(alertRecord, null, 2));
    
    // Insert the alert
    const { data, error } = await supabase
      .from('alerts')
      .insert([alertRecord])
      .select();
    
    if (error) {
      console.error('Error inserting alert into database:', error);
      return null;
    } else {
      console.log('Successfully stored alert:', data?.[0]?.id);
      return data?.[0];
    }
  } catch (err) {
    console.error('Failed to store alert in database:', err);
    return null;
  }
}

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
    
    // First, calculate new alerts from environmental data if not just requesting specific alerts
    const calculateNew = url.searchParams.get('calculateNew') !== 'false';
    let calculatedAlerts: any[] = [];
    
    if (calculateNew) {
      // Fetch environmental data
      const envDataParams = new URLSearchParams();
      if (paintingId) envDataParams.set('paintingId', paintingId);
      if (deviceId) envDataParams.set('deviceId', deviceId);
      
      const envDataUrl = `/api/environmental-data?${envDataParams.toString()}`;
      
      const envDataRes = await fetch(new URL(envDataUrl, request.url).toString());
      if (!envDataRes.ok) {
        throw new Error('Failed to fetch environmental data');
      }
      
      const envData = await envDataRes.json();
      const environmentalData = envData.data || [];
      
      // If there's no environmental data, we can't calculate alerts
      if (environmentalData.length === 0) {
        console.log('No environmental data found to calculate alerts');
      } else {
        // Fetch paintings with their materials to check thresholds
        const paintingsRes = await fetch(new URL('/api/paintings', request.url).toString());
        if (!paintingsRes.ok) {
          throw new Error('Failed to fetch paintings');
        }
        
        const paintingsData = await paintingsRes.json();
        const paintings = paintingsData.paintings || [];
        
        // For each painting, find the environmental data and check against thresholds
        for (const painting of paintings) {
          if (!painting.painting_materials || painting.painting_materials.length === 0) {
            console.log(`Painting ${painting.id} has no materials defined, skipping...`);
            continue;
          }
          
          // Filter environmental data for this painting
          const paintingEnvData = environmentalData.filter((data: any) => data.painting_id === painting.id);
          
          if (paintingEnvData.length === 0) {
            console.log(`No environmental data found for painting ${painting.id}`);
            continue;
          }
          
          // Get the most recent environmental data for this painting
          const latestData = paintingEnvData.sort((a: any, b: any) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          })[0];
          
          const materials = painting.painting_materials[0].materials;
          
          // Check each property against thresholds
          for (const [propertyName, mapping] of Object.entries(PROPERTY_MAPPINGS)) {
            if (!latestData[propertyName]) continue;
            
            const thresholdLower = materials[`threshold_${mapping.dbName}_lower`];
            const thresholdUpper = materials[`threshold_${mapping.dbName}_upper`];
            const value = latestData[propertyName];
            
            // Skip if thresholds are not set
            if (thresholdLower === null && thresholdUpper === null) continue;
            
            if (thresholdLower !== null && value < thresholdLower) {
              // Create a lower threshold alert
              const alert = {
                id: `${painting.id}-${propertyName}-lower-${latestData.timestamp}`,
                painting_id: painting.id,
                device_id: latestData.device_id,
                environmental_data_id: latestData.id,
                alert_type: propertyName,
                threshold_exceeded: 'lower',
                measured_value: value,
                threshold_value: thresholdLower,
                timestamp: latestData.timestamp
              };
              
              // Store in database and add to results
              const storedAlert = await storeAlertRecord(alert);
              if (storedAlert) {
                calculatedAlerts.push(storedAlert);
              }
            }
            
            if (thresholdUpper !== null && value > thresholdUpper) {
              // Create an upper threshold alert
              const alert = {
                id: `${painting.id}-${propertyName}-upper-${latestData.timestamp}`,
                painting_id: painting.id,
                device_id: latestData.device_id,
                environmental_data_id: latestData.id,
                alert_type: propertyName,
                threshold_exceeded: 'upper',
                measured_value: value,
                threshold_value: thresholdUpper,
                timestamp: latestData.timestamp
              };
              
              // Store in database and add to results
              const storedAlert = await storeAlertRecord(alert);
              if (storedAlert) {
                calculatedAlerts.push(storedAlert);
              }
            }
          }
        }
      }
    }
    
    // Now fetch alerts from the database with any filters
    let query = supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false });
    
    // Apply filters if provided
    if (paintingId) {
      query = query.eq('painting_id', paintingId);
    }
    
    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('alert_type', type);
    }
    
    const { data: databaseAlerts, error } = await query;
    
    if (error) {
      console.error('Error fetching alerts from database:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return both newly calculated and existing database alerts
    // If an alert was just calculated and stored, it will also be in databaseAlerts,
    // so we'll use a Set to track unique IDs to avoid duplicates
    const allAlerts = [...databaseAlerts];
    
    console.log(`Found ${calculatedAlerts.length} new alerts, ${databaseAlerts.length} total alerts in database`);
    
    return NextResponse.json({
      success: true,
      count: allAlerts.length,
      alerts: allAlerts
    });
  } catch (error) {
    console.error('Error in GET alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// PATCH route - update an alert (used for dismissing)
export async function PATCH(request: Request) {
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