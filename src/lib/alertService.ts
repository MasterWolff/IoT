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
    // Determine the time window for filtering similar alerts based on alert type
    let timeWindowHours = 24; // Default time window in hours
    
    // Customize time window based on alert type
    if (alertData.alert_type) {
      switch (alertData.alert_type.toLowerCase()) {
        case 'co2':
        case 'co2concentration':
          timeWindowHours = 12; // CO2 alerts may need more frequent updates
          break;
        case 'mold_risk_level':
        case 'moldrisklevel':
          timeWindowHours = 48; // Mold risk alerts can have longer windows
          break;
        case 'temperature':
        case 'humidity':
          timeWindowHours = 24; // Default for environmental conditions
          break;
        case 'airpressure':
          timeWindowHours = 12; // Air pressure changes may need monitoring more frequently
          break;
        default:
          timeWindowHours = 24;
      }
    }
    
    // Calculate the timestamp for filtering (now minus the time window)
    const currentDate = new Date();
    const filterDate = new Date(currentDate.getTime() - (timeWindowHours * 60 * 60 * 1000));
    const filterTimestamp = filterDate.toISOString();
    
    // Check if a similar alert already exists and is active within the time window
    const { data: existingAlerts, error: queryError } = await supabase
      .from('alerts')
      .select('*')
      .eq('painting_id', alertData.painting_id)
      .eq('alert_type', alertData.alert_type)
      .eq('threshold_exceeded', alertData.threshold_exceeded)
      .eq('status', 'active')
      .gte('created_at', filterTimestamp)
      .order('created_at', { ascending: false });
    
    if (queryError) {
      console.error('Error checking for existing alerts:', queryError);
      return null;
    }
    
    // If any similar active alerts exist within the time window, return the most recent one
    if (existingAlerts && existingAlerts.length > 0) {
      const existingAlert = existingAlerts[0];
      const existingAlertDate = new Date(existingAlert.created_at);
      const hoursSinceLastAlert = (currentDate.getTime() - existingAlertDate.getTime()) / (1000 * 60 * 60);
      
      // Add an additional check for values that are very close to the previous alert
      // Only create a new alert if the measured value has changed significantly
      const previousValue = existingAlert.measured_value;
      const currentValue = alertData.measured_value;
      
      // Define threshold percentage changes that would trigger a new alert
      const significantChangeThreshold = getSignificantChangeThreshold(alertData.alert_type);
      
      // Check if we have valid values to compare
      if (currentValue !== undefined && currentValue !== null && previousValue !== null) {
        const valueChangePercent = Math.abs((currentValue - previousValue) / previousValue * 100);
        
        // Check if the change is significant enough to create a new alert
        const isSignificantChange = valueChangePercent > significantChangeThreshold;
        
        // If the alert is within the time window and the change is not significant, skip creating a new one
        if (!isSignificantChange) {
          console.log(`Similar active alert already exists for ${alertData.alert_type} ${alertData.threshold_exceeded} from ${hoursSinceLastAlert.toFixed(1)} hours ago. Value change ${valueChangePercent.toFixed(1)}% is below threshold ${significantChangeThreshold}%. Skipping.`);
          return existingAlert as AlertRecord;
        }
        
        console.log(`Similar active alert exists but measured value changed significantly (${valueChangePercent.toFixed(1)}% > ${significantChangeThreshold}%). Creating a new alert.`);
      } else {
        // If we don't have valid values, use the time window as the only criteria
        console.log(`Similar active alert already exists from ${hoursSinceLastAlert.toFixed(1)} hours ago, but can't compare values. Using default behavior.`);
        return existingAlert as AlertRecord;
      }
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
 * Helper function to determine the significant change threshold percentage for each alert type
 */
function getSignificantChangeThreshold(alertType: string | undefined): number {
  if (!alertType) return 10; // Default 10% change threshold
  
  switch (alertType.toLowerCase()) {
    case 'temperature':
      return 5;  // 5% change in temperature is significant
    case 'humidity':
      return 10; // 10% change in humidity is significant
    case 'co2':
    case 'co2concentration':
      return 15; // 15% change in CO2 is significant 
    case 'airpressure':
      return 3;  // 3% change in air pressure is significant
    case 'mold_risk_level':
    case 'moldrisklevel':
      return 0;  // Any change in mold risk level is significant (levels are discrete)
    case 'illuminance':
      return 20; // 20% change in light level is significant
    default:
      return 10; // Default 10% change threshold
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
  
  // First, check if this environmental data point has already been processed for alerts
  const { data: existingAlerts, error: queryError } = await supabase
    .from('alerts')
    .select('id')
    .eq('environmental_data_id', envData.id);
  
  if (queryError) {
    console.error('Error checking if data point has existing alerts:', queryError);
  } else if (existingAlerts && existingAlerts.length > 0) {
    console.log(`Environmental data point ${envData.id} already has ${existingAlerts.length} alerts. Skipping processing.`);
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
        console.log(`Creating CO2 alert: ${value} ppm exceeds ${thresholdUpper} ppm threshold`, {
          alert_type: alertType,
          measured_value: value,
          threshold_value: thresholdUpper,
          painting_id: envData.painting_id,
          device_id: envData.device_id,
          environmental_data_id: envData.id,
          timestamp: envData.timestamp,
          envDataHasCo2: envData.co2concentration !== undefined && envData.co2concentration !== null
        });
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
    // First, get a list of all environmental data IDs that already have alerts
    // This allows us to efficiently skip these in bulk rather than checking one by one
    const { data: existingAlertData, error: alertError } = await supabase
      .from('alerts')
      .select('environmental_data_id')
      .not('environmental_data_id', 'is', null);
    
    if (alertError) {
      console.error('Error fetching existing alerts:', alertError);
      return [];
    }
    
    // Create a Set of environmental data IDs that already have alerts for fast lookup
    const processedDataIds = new Set(existingAlertData?.map(a => a.environmental_data_id) || []);
    console.log(`Found ${processedDataIds.size} environmental data points that already have alerts`);
    
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
    
    // Filter out data points that already have alerts
    const dataToProcess = data.filter(dataPoint => !processedDataIds.has(dataPoint.id));
    
    console.log(`Found ${data.length} environmental data points, ${dataToProcess.length} need processing`);
    
    if (dataToProcess.length === 0) {
      console.log('All recent environmental data points already have alerts. Nothing to process.');
      return [];
    }
    
    // Process each data point and collect alerts
    const alertPromises = dataToProcess.map(dataPoint => processEnvironmentalData(dataPoint as EnvironmentalData));
    const alertResults = await Promise.all(alertPromises);
    
    // Flatten the array of arrays
    const allAlerts = alertResults.flat();
    
    console.log(`Processed ${dataToProcess.length} data points, generated ${allAlerts.length} alerts`);
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
    console.log(`Updating alert ${alertId} status to ${status}`);
    
    // Get the current alert to check painting ID
    const { data: currentAlert, error: getError } = await supabase
      .from('alerts')
      .select('painting_id')
      .eq('id', alertId)
      .single();
    
    if (getError) {
      console.error('Error getting alert:', getError);
      return false;
    }
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // If we're dismissing the alert, set the dismissed_at timestamp
    if (status === 'dismissed') {
      updateData.dismissed_at = new Date().toISOString();
    }
    
    // Update the alert status
    const { error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', alertId);
    
    if (error) {
      console.error('Error updating alert status:', error);
      return false;
    }
    
    console.log(`Alert ${alertId} status updated to ${status}`);
    
    // If we're dismissing the alert, clear the email rate limiting for this painting
    if (status === 'dismissed' && currentAlert?.painting_id) {
      try {
        // Dynamically import to avoid circular dependency
        const { clearRateLimitingForPainting } = await import('./email');
        await clearRateLimitingForPainting(currentAlert.painting_id);
        console.log(`Rate limiting cleared for painting ${currentAlert.painting_id}`);
      } catch (importError) {
        console.error('Error importing email service:', importError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating alert status:', error);
    return false;
  }
}

// When alerts are dismissed, clear the rate limiting for that painting
// This allows a new alert email to be sent immediately if a new alert is generated
export async function handleAlertDismissal(alertId: string): Promise<boolean> {
  try {
    // Get the alert details
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .select('painting_id')
      .eq('id', alertId)
      .single();
    
    if (alertError || !alert) {
      console.error('Error fetching alert for dismissal:', alertError);
      return false;
    }
    
    // Update the alert status
    const { error: updateError } = await supabase
      .from('alerts')
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
      .eq('id', alertId);
    
    if (updateError) {
      console.error('Error dismissing alert:', updateError);
      return false;
    }
    
    // Clear the rate limiting for this painting's alerts
    try {
      // Import the email service function
      const { clearRateLimitingForPainting } = await import('./email');
      
      // Clear rate limiting
      await clearRateLimitingForPainting(alert.painting_id);
      console.log(`Rate limiting cleared for painting ${alert.painting_id} after alert dismissal`);
    } catch (importError) {
      console.error('Error importing email service:', importError);
    }
    
    return true;
  } catch (error) {
    console.error('Error in handleAlertDismissal:', error);
    return false;
  }
} 