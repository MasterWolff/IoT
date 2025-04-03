import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PROPERTY_MAPPINGS } from '@/lib/propertyMapper';

// Define types for alerts and related data
interface Alert {
  id: string;
  painting_id: string;
  device_id: string;
  environmental_data_id: string;
  alert_type: string;
  threshold_exceeded: 'upper' | 'lower';
  measured_value: number;
  threshold_value: number;
  material_id: string;
  timestamp: string;
  created_at: string;
  paintings: any;
  devices: any;
  materials: any;
}

// Helper function to store alert in the alerts table
async function storeAlertRecord(alert: Alert) {
  try {
    // Check if the alert already exists in our table to avoid duplicates
    const { data: existingAlert, error: checkError } = await supabase
      .from('alerts')
      .select('id')
      .eq('environmental_data_id', alert.environmental_data_id)
      .eq('alert_type', alert.alert_type)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is expected
      console.error('Error checking for existing alert:', checkError);
      return;
    }
    
    // If alert already exists, don't create a duplicate
    if (existingAlert) {
      console.log(`Alert already exists in database: ${existingAlert.id}`);
      return;
    }
    
    // Store the alert in the alerts table
    const { error: insertError } = await supabase
      .from('alerts')
      .insert([{
        id: alert.id,
        painting_id: alert.painting_id,
        device_id: alert.device_id,
        environmental_data_id: alert.environmental_data_id,
        alert_type: alert.alert_type,
        threshold_exceeded: alert.threshold_exceeded,
        measured_value: alert.measured_value,
        threshold_value: alert.threshold_value,
        status: 'active',
        timestamp: alert.timestamp,
        created_at: new Date().toISOString()
      }]);
    
    if (insertError) {
      // If we get a table doesn't exist error, that's okay - the user probably 
      // hasn't set up the alerts table yet. The alerts functionality will still work.
      if (insertError.code !== '42P01') {
        console.error('Error storing alert in database:', insertError);
      }
    }
  } catch (error) {
    console.error('Error in storeAlertRecord:', error);
    // Don't throw error, just log it - we want the original alerts functionality to continue
  }
}

// GET alerts by checking environmental data against material thresholds
export async function GET(request: Request) {
  try {
    console.log('Alerts API called');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const paintingId = searchParams.get('paintingId');
    const deviceId = searchParams.get('deviceId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    
    console.log(`Query params: paintingId=${paintingId}, deviceId=${deviceId}, limit=${limit}`);
    
    // First, get all paintings with their associated materials
    let paintingsQuery = supabase
      .from('paintings')
      .select('*, painting_materials(materials(*)), devices(*)');
    
    if (paintingId) {
      paintingsQuery = paintingsQuery.eq('id', paintingId);
    }
    
    const { data: paintings, error: paintingsError } = await paintingsQuery;
    
    if (paintingsError) {
      console.error('Error fetching paintings:', paintingsError);
      return NextResponse.json(
        { error: paintingsError.message },
        { status: 500 }
      );
    }
    
    console.log(`Found ${paintings?.length || 0} paintings`);
    
    // Now, get environmental data for these paintings
    let envDataQuery = supabase
      .from('environmental_data')
      .select('*, paintings(*), devices(*)')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (paintingId) {
      envDataQuery = envDataQuery.eq('painting_id', paintingId);
    }
    
    if (deviceId) {
      envDataQuery = envDataQuery.eq('device_id', deviceId);
    }
    
    const { data: envData, error: envDataError } = await envDataQuery;
    
    if (envDataError) {
      console.error('Error fetching environmental data:', envDataError);
      return NextResponse.json(
        { error: envDataError.message },
        { status: 500 }
      );
    }
    
    console.log(`Found ${envData?.length || 0} environmental data records`);
    if (envData && envData.length > 0) {
      console.log('Sample env data:', JSON.stringify(envData[0], null, 2));
    }
    
    // Calculate alerts based on environmental data and material thresholds
    const alerts: Alert[] = [];
    
    // Helper to check threshold for any property
    const checkThreshold = (data: any, material: any, propConfig: any): Alert | null => {
      const { dbName, arduinoNames } = propConfig;
      const value = data[dbName];
      
      // Skip if no measurement value
      if (value === null || value === undefined) {
        console.log(`No value for ${dbName} in data record ${data.id}`);
        return null;
      }
      
      // Try different threshold field name formats
      // Format 1: threshold_dbname_lower (e.g., threshold_temperature_lower)
      let lowerThresholdKey = `threshold_${dbName}_lower`;
      let upperThresholdKey = `threshold_${dbName}_upper`;
      
      // Format 2: threshold_originalname_lower (e.g., threshold_moldrisklevel_lower)
      // This handles cases where the database column uses underscores but threshold fields don't
      if (material[lowerThresholdKey] === undefined && material[upperThresholdKey] === undefined) {
        const dbNameNoUnderscores = dbName.replace(/_/g, '');
        lowerThresholdKey = `threshold_${dbNameNoUnderscores}_lower`;
        upperThresholdKey = `threshold_${dbNameNoUnderscores}_upper`;
      }
      
      // Format 3: threshold_arduinoNames_lower (e.g., threshold_co2concentration_lower)
      if (material[lowerThresholdKey] === undefined && material[upperThresholdKey] === undefined) {
        for (const arduinoName of arduinoNames) {
          const arduinoLowerKey = `threshold_${arduinoName.toLowerCase()}_lower`;
          const arduinoUpperKey = `threshold_${arduinoName.toLowerCase()}_upper`;
          
          if (material[arduinoLowerKey] !== undefined || material[arduinoUpperKey] !== undefined) {
            lowerThresholdKey = arduinoLowerKey;
            upperThresholdKey = arduinoUpperKey;
            break;
          }
        }
      }
      
      // Check if thresholds are defined
      const lowerThreshold = material[lowerThresholdKey];
      const upperThreshold = material[upperThresholdKey];
      
      console.log(`Checking ${dbName}: value=${value}, lowerThresholdKey=${lowerThresholdKey}, upperThresholdKey=${upperThresholdKey}`);
      console.log(`Threshold values: lowerThreshold=${lowerThreshold}, upperThreshold=${upperThreshold}`);
      
      // Check if value exceeds thresholds
      if ((lowerThreshold !== null && lowerThreshold !== undefined && value < lowerThreshold) ||
          (upperThreshold !== null && upperThreshold !== undefined && value > upperThreshold)) {
        
        const thresholdExceeded = (upperThreshold !== null && upperThreshold !== undefined && value > upperThreshold) ? 'upper' : 'lower';
        const thresholdValue = thresholdExceeded === 'upper' ? upperThreshold : lowerThreshold;
        
        console.log(`ALERT: ${dbName} value ${value} exceeds threshold (${thresholdExceeded}: ${thresholdValue})`);
        
        // Use a standardized alert_type for consistency in the UI
        let alertType = dbName;
        if (dbName === 'co2concentration') alertType = 'co2';
        if (dbName === 'moldrisklevel') alertType = 'mold_risk_level';
        if (dbName === 'airpressure') alertType = 'airpressure';
        
        return {
          id: `${dbName}-${data.id}-${material.id}`,
          painting_id: data.painting_id,
          device_id: data.device_id,
          environmental_data_id: data.id,
          alert_type: alertType,
          threshold_exceeded: thresholdExceeded,
          measured_value: value,
          threshold_value: thresholdValue!,
          material_id: material.id,
          timestamp: data.timestamp,
          created_at: data.created_at || data.timestamp,
          paintings: data.paintings,
          devices: data.devices,
          materials: material
        };
      }
      
      return null;
    };
    
    // Process all environmental data entries
    for (const data of envData) {
      // Find the painting and its materials
      const painting = paintings.find(p => p.id === data.painting_id);
      if (!painting || !painting.painting_materials) {
        console.log(`No painting or materials found for data record ${data.id}, painting_id=${data.painting_id}`);
        continue;
      }
      
      // Check each material associated with the painting
      for (const pm of painting.painting_materials) {
        if (!pm.materials) {
          console.log(`No materials found in painting_materials for painting ${painting.id}`);
          continue;
        }
        const material = pm.materials;
        
        console.log(`Checking thresholds for painting ${painting.id}, material ${material.id}`);
        console.log('Material thresholds:', JSON.stringify(material, null, 2));
        
        // Check thresholds for all supported properties
        Object.values(PROPERTY_MAPPINGS).forEach(propConfig => {
          const alert = checkThreshold(data, material, propConfig);
          if (alert) {
            alerts.push(alert);
            
            // Store the alert in the alerts table (don't await to avoid slowing down response)
            storeAlertRecord(alert).catch(err => {
              console.error('Failed to store alert in database:', err);
            });
          }
        });
      }
    }
    
    // Now, try to fetch dismissed alerts from the alerts table to filter them out
    try {
      // Check if alerts table exists by trying to select from it
      const { data: dismissedAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('id')
        .eq('status', 'dismissed');
        
      if (!alertsError) {
        // If alerts table exists, filter out dismissed alerts
        const dismissedIds = new Set(dismissedAlerts.map(a => a.id));
        const filteredAlerts = alerts.filter(alert => !dismissedIds.has(alert.id));
        
        console.log(`Found ${alerts.length} alerts, ${dismissedIds.size} dismissed, returning ${filteredAlerts.length}`);
        
        return NextResponse.json({
          success: true,
          count: filteredAlerts.length,
          alerts: filteredAlerts
        });
      }
    } catch (error) {
      // Ignore errors here - if the alerts table doesn't exist, we'll just return all alerts
      console.log('Could not check for dismissed alerts:', error);
    }
    
    console.log(`Found ${alerts.length} alerts`);
    if (alerts.length > 0) {
      console.log('Sample alert:', JSON.stringify(alerts[0], null, 2));
    }
    
    return NextResponse.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error calculating alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate alerts' },
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