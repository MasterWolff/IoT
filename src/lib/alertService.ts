/**
 * Unified Alert Service
 * 
 * This module centralizes all alert-related logic to ensure consistency across the application.
 * It handles threshold checking, alert generation, and status determination.
 */

import { supabase } from './supabase';
import { PROPERTY_MAPPINGS } from './propertyMapper';

// Helper function to generate UUIDs
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, 
          v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Type definitions
export interface AlertThreshold {
  lower: number | null;
  upper: number | null;
}

export interface AlertRecord {
  id: string;
  painting_id: string;
  device_id?: string;
  environmental_data_id?: string;
  alert_type: string;
  threshold_exceeded: 'upper' | 'lower';
  measured_value: number;
  threshold_value: number;
  status: 'active' | 'dismissed';
  timestamp: string;
  created_at?: string;
  updated_at?: string;
  dismissed_at?: string;
  paintings?: {
    id: string;
    name: string;
    artist: string;
    painting_materials?: {
      materials: Record<string, any>;
    }[];
  };
}

export interface EnvironmentalData {
  id: string;
  device_id: string;
  painting_id: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  co2concentration: number | null;
  airpressure: number | null;
  moldrisklevel: number | null;
  illuminance: number | null;
  paintings?: {
    id: string;
    name: string;
    artist: string;
    painting_materials?: {
      materials: Record<string, any>;
    }[];
  };
  devices?: {
    id: string;
    name: string;
    status: string;
  };
}

/**
 * Ensure alerts table exists in the database
 */
export async function ensureAlertsTableExists(): Promise<boolean> {
  try {
    console.log('Checking if alerts table exists...');
    
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
        return false;
      }
      
      console.log('Alerts table created successfully');
      return true;
    }
    
    // If no error, table exists
    if (!error) {
      console.log('Alerts table exists');
      return true;
    }
    
    // For any other error
    console.error('Error checking alerts table:', error);
    return false;
  } catch (err) {
    console.error('Unexpected error checking/creating alerts table:', err);
    return false;
  }
}

/**
 * Store an alert record in the database, avoiding duplicates
 */
export async function storeAlertRecord(alertData: Partial<AlertRecord>): Promise<AlertRecord | null> {
  try {
    // Check if a similar alert already exists and is active
    const { data: existingAlerts, error: queryError } = await supabase
      .from('alerts')
      .select('*')
      .eq('painting_id', alertData.painting_id)
      .eq('alert_type', alertData.alert_type)
      .eq('threshold_exceeded', alertData.threshold_exceeded)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (queryError) {
      console.error('Error checking for existing alerts:', queryError);
      return null;
    }
    
    // If a similar active alert exists, check when it was created
    if (existingAlerts && existingAlerts.length > 0) {
      const existingAlert = existingAlerts[0];
      const existingAlertDate = new Date(existingAlert.created_at);
      const currentDate = new Date();
      const hoursSinceLastAlert = (currentDate.getTime() - existingAlertDate.getTime()) / (1000 * 60 * 60);
      
      // If the alert is less than 24 hours old, skip creating a new one
      if (hoursSinceLastAlert < 24) {
        console.log(`Similar active alert already exists for ${alertData.alert_type} ${alertData.threshold_exceeded} from ${hoursSinceLastAlert.toFixed(1)} hours ago. Skipping.`);
        return existingAlert as AlertRecord;
      }
      
      console.log(`Similar active alert exists but was created ${hoursSinceLastAlert.toFixed(1)} hours ago (>24 hours). Creating a new alert.`);
    }
    
    // Format the alert for insertion - explicitly generate a UUID
    const newAlert = {
      ...alertData,
      // Generate a UUID for the alert
      id: generateUUID(),
      status: 'active',
      created_at: new Date().toISOString(),
    };
    
    console.log(`Creating new alert with ID: ${newAlert.id}`);
    
    // Insert the new alert
    const { data, error } = await supabase
      .from('alerts')
      .insert([newAlert])
      .select('*')
      .single();
    
    if (error) {
      console.error('Error storing alert record:', error);
      return null;
    }
    
    // Get the painting info separately since the join is not working
    let alertWithPainting = data as AlertRecord;
    
    try {
      const { data: paintingData, error: paintingError } = await supabase
        .from('paintings')
        .select('id, name, artist')
        .eq('id', data.painting_id)
        .single();
        
      if (!paintingError && paintingData) {
        alertWithPainting = {
          ...data,
          paintings: paintingData
        } as AlertRecord;
      }
    } catch (paintingErr) {
      console.error('Error fetching painting data for alert:', paintingErr);
    }
    
    console.log(`Alert created successfully: ${data.id} (${data.alert_type})`);
    return alertWithPainting;
  } catch (err) {
    console.error('Unexpected error storing alert:', err);
    return null;
  }
}

/**
 * Checks if a given measurement exceeds thresholds
 */
export function exceedsThresholds(
  measurement: Record<string, any>, 
  property: string, 
  thresholds?: AlertThreshold
): { exceeds: boolean; threshold: 'upper' | 'lower' | null; value: number | null; thresholdValue: number | null } {
  // Get the property value
  const value = measurement[property];
  
  // If no value, can't exceed threshold
  if (value === null || value === undefined) {
    return { exceeds: false, threshold: null, value: null, thresholdValue: null };
  }

  // Special case for mold risk level - directly use Arduino's risk value
  // 0 = no risk, 1 = moderate risk, 2 = high risk (only 2 should trigger alerts)
  if (property === 'moldrisklevel') {
    return { 
      exceeds: value === 2,  // Only level 2 (high risk) counts as exceeding threshold
      threshold: value === 2 ? 'upper' : null,
      value: value,
      thresholdValue: 1  // The threshold between moderate and high risk
    };
  }

  let thresholdLower = null;
  let thresholdUpper = null;

  // If thresholds are provided directly, use them
  if (thresholds) {
    thresholdLower = thresholds.lower;
    thresholdUpper = thresholds.upper;
  }
  // Otherwise, try to extract them from the painting's materials
  else if (measurement.paintings?.painting_materials && measurement.paintings.painting_materials.length > 0) {
    const materials = measurement.paintings.painting_materials[0].materials;
    
    // Check for different naming patterns in the materials object
    if (property === 'co2concentration') {
      thresholdLower = materials.threshold_co2concentration_lower;
      thresholdUpper = materials.threshold_co2concentration_upper;
    } else if (property === 'moldrisklevel') {
      // This should not happen anymore with our special case handling above,
      // but keeping it for backward compatibility
      thresholdLower = materials.threshold_moldrisklevel_lower;
      thresholdUpper = materials.threshold_moldrisklevel_upper;
    } else {
      thresholdLower = materials[`threshold_${property}_lower`];
      thresholdUpper = materials[`threshold_${property}_upper`];
    }
  }
  
  // Ensure thresholds are numbers
  thresholdLower = typeof thresholdLower === 'number' ? thresholdLower : null;
  thresholdUpper = typeof thresholdUpper === 'number' ? thresholdUpper : null;
  
  // Special case for CO2 - log values over 600 ppm
  if (property === 'co2concentration' && value > 600) {
    console.log(`CO2 threshold check: ${value} ppm, thresholds: ${thresholdLower}-${thresholdUpper} ppm`);
  }
  
  // Check against lower threshold
  if (thresholdLower !== null && value < thresholdLower) {
    return { 
      exceeds: true, 
      threshold: 'lower', 
      value: value, 
      thresholdValue: thresholdLower 
    };
  }
  
  // Check against upper threshold
  if (thresholdUpper !== null && value > thresholdUpper) {
    return { 
      exceeds: true, 
      threshold: 'upper', 
      value: value, 
      thresholdValue: thresholdUpper 
    };
  }
  
  // Default - doesn't exceed any threshold
  return { 
    exceeds: false, 
    threshold: null, 
    value: value, 
    thresholdValue: null 
  };
}

/**
 * Process a single environmental data point to check for and generate alerts
 */
export async function processEnvironmentalData(envData: EnvironmentalData): Promise<AlertRecord[]> {
  const alerts: AlertRecord[] = [];
  
  if (!envData) {
    console.log('No environmental data provided to process');
    return alerts;
  }
  
  if (!envData.paintings || !envData.paintings.painting_materials || envData.paintings.painting_materials.length === 0) {
    console.log(`No painting materials found for painting ID: ${envData.painting_id}`);
    return alerts;
  }
  
  console.log(`Processing environmental data for painting: ${envData.paintings.name} (${envData.paintings.id})`);
  
  // Get the material thresholds
  const materials = envData.paintings.painting_materials[0].materials;
  if (!materials) {
    console.log('No material thresholds found');
    return alerts;
  }
  
  // Check each property against thresholds
  for (const [propertyKey, mapping] of Object.entries(PROPERTY_MAPPINGS)) {
    const { dbName } = mapping;
    // Fixed TypeScript error by using type assertion for dynamic property access
    const value = (envData as any)[dbName];
    
    // Skip properties with no value
    if (value === null || value === undefined) continue;
    
    // Get threshold field names
    const lowerThresholdKey = `threshold_${dbName}_lower`;
    const upperThresholdKey = `threshold_${dbName}_upper`;
    
    // Get threshold values
    const thresholdLower = materials[lowerThresholdKey];
    const thresholdUpper = materials[upperThresholdKey];
    
    // Skip if no thresholds are defined for this property
    if (thresholdLower === null && thresholdUpper === null) {
      // Special handling for CO2 - always check even without explicit thresholds
      if (dbName === 'co2concentration' && value > 600) {
        console.log(`High CO2 detected (${value} ppm) - creating alert with default threshold`);
        const alertType = 'co2'; // Standardize CO2 alert type
        
        // Create alert with default threshold - NOTE: removed custom ID
        const alert: Partial<AlertRecord> = {
          painting_id: envData.painting_id,
          device_id: envData.device_id,
          environmental_data_id: envData.id,
          alert_type: alertType,
          threshold_exceeded: 'upper',
          measured_value: value,
          threshold_value: 600, // Default threshold
          timestamp: envData.timestamp
        };
        
        const storedAlert = await storeAlertRecord(alert);
        if (storedAlert) {
          alerts.push(storedAlert);
        }
      }
      // Special handling for Mold Risk Level - use the Arduino-calculated value directly
      // 0 = no risk, 1 = moderate risk, 2 = high risk (only 2 should trigger alerts)
      else if (dbName === 'moldrisklevel' && value === 2) {
        console.log(`High mold risk detected (level ${value}) - creating alert`);
        const alertType = 'mold_risk_level';
        
        const alert: Partial<AlertRecord> = {
          painting_id: envData.painting_id,
          device_id: envData.device_id,
          environmental_data_id: envData.id,
          alert_type: alertType,
          threshold_exceeded: 'upper',
          measured_value: value,
          threshold_value: 1, // Threshold between moderate and high risk
          timestamp: envData.timestamp
        };
        
        const storedAlert = await storeAlertRecord(alert);
        if (storedAlert) {
          alerts.push(storedAlert);
        }
      }
      continue;
    }
    
    // Standardize alert type naming
    let alertType = dbName;
    if (dbName === 'co2concentration') alertType = 'co2';
    if (dbName === 'moldrisklevel') alertType = 'mold_risk_level';
    
    // Skip material threshold checks for moldrisklevel since we use Arduino's calculated values
    if (dbName === 'moldrisklevel') {
      // For moldrisklevel, we only create alerts for level 2 (high risk)
      if (value === 2) {
        console.log(`High mold risk detected (level ${value}) - creating alert`);
        
        const alert: Partial<AlertRecord> = {
          painting_id: envData.painting_id,
          device_id: envData.device_id,
          environmental_data_id: envData.id,
          alert_type: 'mold_risk_level',
          threshold_exceeded: 'upper',
          measured_value: value,
          threshold_value: 1, // Threshold between moderate and high risk
          timestamp: envData.timestamp
        };
        
        const storedAlert = await storeAlertRecord(alert);
        if (storedAlert) {
          alerts.push(storedAlert);
        }
      }
      continue; // Skip the regular threshold checking for mold risk
    }
    
    // Debug log for CO2 values
    if (dbName === 'co2concentration') {
      console.log(`Checking CO2 threshold: ${value} ppm against ${thresholdLower}-${thresholdUpper} ppm`);
    }
    
    // Check lower threshold
    if (thresholdLower !== null && value < thresholdLower) {
      const alert: Partial<AlertRecord> = {
        painting_id: envData.painting_id,
        device_id: envData.device_id,
        environmental_data_id: envData.id,
        alert_type: alertType,
        threshold_exceeded: 'lower',
        measured_value: value,
        threshold_value: thresholdLower,
        timestamp: envData.timestamp
      };
      
      const storedAlert = await storeAlertRecord(alert);
      if (storedAlert) {
        alerts.push(storedAlert);
      }
    }
    
    // Check upper threshold
    if (thresholdUpper !== null && value > thresholdUpper) {
      const alert: Partial<AlertRecord> = {
        painting_id: envData.painting_id,
        device_id: envData.device_id,
        environmental_data_id: envData.id,
        alert_type: alertType,
        threshold_exceeded: 'upper',
        measured_value: value,
        threshold_value: thresholdUpper,
        timestamp: envData.timestamp
      };
      
      // Additional logging for CO2 alerts
      if (dbName === 'co2concentration') {
        console.log(`Creating CO2 alert: ${value} ppm exceeds ${thresholdUpper} ppm threshold`);
      }
      
      const storedAlert = await storeAlertRecord(alert);
      if (storedAlert) {
        alerts.push(storedAlert);
      }
    }
  }
  
  return alerts;
}

/**
 * Fetch alerts from the database with optional filters
 */
export async function getAlerts({
  paintingId,
  deviceId,
  status,
  type
}: {
  paintingId?: string;
  deviceId?: string;
  status?: string;
  type?: string;
} = {}): Promise<AlertRecord[]> {
  try {
    // Ensure alerts table exists
    await ensureAlertsTableExists();
    
    // Build the database query
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
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No alerts found in database matching filters');
      return [];
    }
    
    console.log(`Found ${data.length} alerts in database`);
    
    // Get painting information for each alert separately
    const alertsWithPaintings = await Promise.all(
      data.map(async (alert) => {
        try {
          const { data: paintingData, error: paintingError } = await supabase
            .from('paintings')
            .select(`
              id, 
              name, 
              artist, 
              painting_materials(
                materials(*)
              )
            `)
            .eq('id', alert.painting_id)
            .single();
            
          if (paintingError || !paintingData) {
            return alert as AlertRecord;
          }
          
          return {
            ...alert,
            paintings: paintingData
          } as AlertRecord;
        } catch (paintingErr) {
          console.error(`Error fetching painting for alert ${alert.id}:`, paintingErr);
          return alert as AlertRecord;
        }
      })
    );
    
    return alertsWithPaintings;
  } catch (err) {
    console.error('Unexpected error fetching alerts:', err);
    return [];
  }
}

/**
 * Process all environmental data to generate alerts
 */
export async function processAllEnvironmentalData(): Promise<AlertRecord[]> {
  console.log('Processing all environmental data for alerts...');
  
  try {
    // Fetch environmental data with paintings and their materials
    const { data, error } = await supabase
      .from('environmental_data')
      .select(`
        *,
        paintings(
          id, 
          name, 
          artist,
          painting_materials(
            materials(*)
          )
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching environmental data:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No environmental data found');
      return [];
    }
    
    console.log(`Found ${data.length} environmental data points to process`);
    
    // Process each data point and collect alerts
    const alertPromises = data.map(dataPoint => processEnvironmentalData(dataPoint as EnvironmentalData));
    const alertResults = await Promise.all(alertPromises);
    
    // Flatten the array of arrays
    const allAlerts = alertResults.flat();
    
    console.log(`Processed ${data.length} data points, generated ${allAlerts.length} alerts`);
    return allAlerts;
  } catch (err) {
    console.error('Unexpected error processing environmental data:', err);
    return [];
  }
}

/**
 * Update an alert's status
 */
export async function updateAlertStatus(
  alertId: string, 
  status: 'active' | 'dismissed'
): Promise<boolean> {
  try {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    // If dismissing, set the dismissed_at timestamp
    if (status === 'dismissed') {
      updateData.dismissed_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', alertId);
    
    if (error) {
      console.error(`Error updating alert ${alertId} status:`, error);
      return false;
    }
    
    console.log(`Alert ${alertId} status updated to ${status}`);
    return true;
  } catch (err) {
    console.error('Unexpected error updating alert status:', err);
    return false;
  }
} 