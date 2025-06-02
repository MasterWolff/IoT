import { supabase } from './supabase';
import type { Painting, Material, Device, EnvironmentalData } from './supabase';
import type { AlertInfo } from './email';
import { PROPERTY_MAPPINGS } from './propertyMapper';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Type definitions
type AlertData = {
  id: string;
  painting_id: string;
  device_id: string;
  alert_type: string;
  measured_value: number;
  threshold_value: number;
  threshold_exceeded: 'upper' | 'lower';
  timestamp: string;
  status: string;
  paintings?: {
    id: string;
    name: string;
    artist: string;
    painting_materials?: Array<{
      materials: {
        threshold_temperature_lower: number | null;
        threshold_temperature_upper: number | null;
        threshold_humidity_lower: number | null;
        threshold_humidity_upper: number | null;
        threshold_co2concentration_lower: number | null;
        threshold_co2concentration_upper: number | null;
        threshold_moldrisklevel_lower: number | null;
        threshold_moldrisklevel_upper: number | null;
        threshold_airpressure_lower: number | null;
        threshold_airpressure_upper: number | null;
        threshold_illuminance_lower: number | null;
        threshold_illuminance_upper: number | null;
      };
    }>;
  };
  devices?: {
    name: string;
    status: string;
  };
};

type GetAlertsResult = {
  success: boolean;
  error: string | null;
  alerts: AlertData[];
};

type CheckAlertsResult = {
  success: boolean;
  error?: string;
  alertsCount?: number;
  emailsSent?: number;
  message?: string;
  paintingsWithAlerts?: Array<{
    painting: {
      id: string;
      name: string;
      artist: string;
      [key: string]: any;
    };
    alerts: AlertData[];
  }>;
};

// Paintings API
export async function getPaintings() {
  const { data, error } = await supabase
    .from('paintings')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching paintings:', error);
    return [];
  }
  
  return data as Painting[];
}

export async function getPaintingById(id: string) {
  const { data, error } = await supabase
    .from('paintings')
    .select(`
      *,
      painting_materials(
        material_id,
        materials(*)
      ),
      devices(*),
      environmental_data(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching painting:', error);
    return null;
  }
  
  return data;
}

// Materials API
export async function getMaterials() {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }
  
  return data as Material[];
}

export async function getMaterialById(id: string) {
  const { data, error } = await supabase
    .from('materials')
    .select(`
      *,
      painting_materials(
        painting_id,
        paintings(*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching material:', error);
    return null;
  }
  
  return data;
}

// Devices API
export async function getDevices() {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      paintings(name, artist)
    `);
  
  if (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
  
  return data;
}

export async function getDeviceById(id: string) {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      paintings(*),
      environmental_data(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching device:', error);
    return null;
  }
  
  return data;
}

// Environmental Data API
export async function getLatestEnvironmentalData(paintingId?: string, limit = 10) {
  let query = supabase
    .from('environmental_data')
    .select(`
      *,
      paintings(name, artist),
      devices(*)
    `)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (paintingId) {
    query = query.eq('painting_id', paintingId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching environmental data:', error);
    return [];
  }
  
  return data as EnvironmentalData[];
}

// Store new sensor data
export async function storeSensorData(sensorData: Partial<EnvironmentalData>) {
  // Ensure the timestamp is set if not provided
  if (!sensorData.timestamp) {
    sensorData.timestamp = new Date().toISOString();
  }

  // Insert the data into the database
  const { data, error } = await supabase
    .from('environmental_data')
    .insert(sensorData)
    .select();
  
  if (error) {
    console.error('Error storing sensor data:', error);
    throw new Error(`Failed to store sensor data: ${error.message}`);
  }

  // Update the device's last_measurement timestamp
  if (sensorData.device_id) {
    await supabase
      .from('devices')
      .update({ 
        last_measurement: sensorData.timestamp,
        updated_at: sensorData.timestamp
      })
      .eq('id', sensorData.device_id);
  }
  
  // Check for alerts based on the newly stored data
  try {
    // We can either check all alerts or create a direct check for this specific measurement
    const alertsResult = await checkAlertsAndNotify();
    console.log(`Alert check completed: ${alertsResult.alertsCount} alerts found`);
    
    // Include alert info in the return data
    return {
      data: data,
      alerts: alertsResult
    };
  } catch (alertError) {
    console.error('Error checking for alerts:', alertError);
    // Still return the data even if alert check fails
    return data;
  }
}

// Check for alerts based on environmental data and material thresholds
export async function getAlerts(): Promise<GetAlertsResult> {
  const { data: envData, error: envError } = await supabase
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
    .limit(100);
  
  if (envError) {
    console.error('Error fetching data for alerts:', envError);
    return { success: false, error: envError.message, alerts: [] };
  }
  
  // Process data to find measurements that exceed thresholds
  const alerts = envData?.filter(data => {
    const painting = data.paintings;
    if (!painting || !painting.painting_materials || painting.painting_materials.length === 0) {
      return false;
    }
    
    // Check against thresholds for all materials of the painting
    for (const pm of painting.painting_materials) {
      const material = pm.materials;
      if (!material) continue;
      
      // Check each property using the property mapper
      for (const property of Object.values(PROPERTY_MAPPINGS)) {
        const { dbName } = property;
        const value = data[dbName];
        
        // Skip if no value for this property
        if (value === null || value === undefined) continue;
        
        // Get threshold field names
        const lowerThresholdKey = `threshold_${dbName}_lower`;
        const upperThresholdKey = `threshold_${dbName}_upper`;
        
        // Get the threshold values
        const lowerThreshold = material[lowerThresholdKey];
        const upperThreshold = material[upperThresholdKey];
        
        // Check if value exceeds thresholds
        if ((lowerThreshold !== null && value < lowerThreshold) ||
            (upperThreshold !== null && value > upperThreshold)) {
          return true;
        }
      }
    }
    
    return false;
  }) || [];
  
  return { success: true, alerts, error: null };
}

// Check for alerts and send email notifications if thresholds are exceeded
export async function checkAlertsAndNotify() {
  console.log('🔍 EMAIL CHECK: Starting to check for alerts that need email notifications...');
  
  const result = await getAlerts();
  if (!result.success || !result.alerts || result.alerts.length === 0) {
    console.log('🔍 EMAIL CHECK: No alerts detected at this time.');
    return { success: true, alertsCount: 0 };
  }
  
  console.log(`🔍 EMAIL CHECK: Found ${result.alerts.length} alerts that may require notification.`);
  
  // Lazy import to avoid circular dependencies
  console.log('🔍 EMAIL CHECK: Importing email service...');
  const { sendAlertEmail } = await import('./email');
  console.log('🔍 EMAIL CHECK: Email service imported successfully');
  
  let emailsSent = 0;
  let attemptedEmails = 0;
  
  // Log email configuration
  const { emailConfig, isEmailConfigured } = await import('./emailConfig');
  const emailConfigured = isEmailConfigured();
  
  if (!emailConfigured) {
    console.error('❌ EMAIL CHECK: Email is not configured properly. Cannot send notifications.');
    return { success: false, alertsCount: result.alerts.length, emailsSent: 0, error: 'Email is not configured properly' };
  }
  
  // Group alerts by painting to avoid sending too many emails
  console.log('🔍 EMAIL CHECK: Grouping alerts by painting...');
  
  // Define interface for painting alerts
  interface PaintingAlertGroup {
    painting: {
      id: string;
      name: string;
      artist: string;
      [key: string]: any;
    };
    alerts: AlertData[];
  }
  
  // Create the mapping with proper type
  const alertsByPainting: Record<string, PaintingAlertGroup> = {};
  
  for (const alert of result.alerts) {
    // Skip dismissed alerts
    if (alert.status === 'dismissed') {
      console.log(`🔍 EMAIL CHECK: Skipping dismissed alert ${alert.id}`);
      continue;
    }
    
    // Only include alerts for paintings with materials
    if (!alert.paintings || !alert.paintings.painting_materials) {
      console.log(`🔍 EMAIL CHECK: Skipping alert ${alert.id} - no painting materials defined`);
      continue;
    }
    
    const paintingId = alert.painting_id;
    const painting = alert.paintings;
    
    if (!alertsByPainting[paintingId]) {
      alertsByPainting[paintingId] = {
        painting,
        alerts: []
      };
    }
    
    alertsByPainting[paintingId].alerts.push(alert);
  }
  
  // Convert to array and sort by alert count (most alerts first)
  const paintingsWithAlerts = Object.values(alertsByPainting)
    .filter((entry: PaintingAlertGroup) => entry.alerts.length > 0)
    .sort((a: PaintingAlertGroup, b: PaintingAlertGroup) => b.alerts.length - a.alerts.length);
  
  console.log(`🔍 EMAIL CHECK: Found ${paintingsWithAlerts.length} paintings with active alerts`);
  
  // Now process each painting's alerts
  for (const entry of paintingsWithAlerts) {
    const painting = entry.painting;
    const paintingAlerts = entry.alerts;
    
    for (const alert of paintingAlerts) {
      attemptedEmails++;
      
      try {
        console.log(`🔍 EMAIL CHECK: Sending alert for ${painting.name} - ${alert.alert_type} (${alert.measured_value})`);
        
        // Map alert type to proper measurement type
        let measurementType: any = alert.alert_type;
        if (alert.alert_type === 'co2') measurementType = 'co2';
        if (alert.alert_type === 'temperature') measurementType = 'temperature';
        if (alert.alert_type === 'humidity') measurementType = 'humidity';
        if (alert.alert_type === 'mold_risk_level') measurementType = 'mold_risk_level';
        if (alert.alert_type === 'illuminance') measurementType = 'illuminance';
        
        // Determine unit based on measurement type
        let unit = '';
        switch (measurementType) {
          case 'temperature': unit = '°C'; break;
          case 'humidity': unit = '%'; break;
          case 'co2': unit = 'ppm'; break;
          case 'illuminance': unit = 'lux'; break;
          case 'mold_risk_level': unit = 'level'; break;
          default: unit = ''; break;
        }
        
        // Create thresholds object
        const thresholds = {
          lower: alert.threshold_exceeded === 'lower' ? alert.threshold_value : null,
          upper: alert.threshold_exceeded === 'upper' ? alert.threshold_value : null,
        };
        
        // Send email using the comprehensive email service
        const emailSent = await sendAlertEmail({
          id: alert.id,
          paintingId: alert.painting_id,
          paintingName: painting.name,
          artist: painting.artist,
          measurement: {
            type: measurementType,
            value: alert.measured_value,
            unit: unit
          },
          threshold: thresholds,
          timestamp: alert.timestamp
        });
        
        if (emailSent) {
          emailsSent++;
          console.log(`✅ EMAIL CHECK: Successfully sent alert email for ${painting.name} (${alert.alert_type})`);
        } else {
          console.warn(`⚠️ EMAIL CHECK: Failed to send alert email for ${painting.name} (${alert.alert_type})`);
        }
      } catch (emailError) {
        console.error(`❌ EMAIL CHECK: Error sending alert email for ${painting.name}:`, emailError);
      }
    }
  }
  
  console.log(`🔍 EMAIL CHECK: Attempted ${attemptedEmails} emails, successfully sent ${emailsSent}`);
  
  return {
    success: true,
    alertsCount: result.alerts.length,
    emailsSent,
    paintingsWithAlerts
  };
}

async function checkAlertsAndSendNotifications(): Promise<CheckAlertsResult> {
  console.log('🔍 API: Starting alert check and notification process');
  
  try {
    // Get alerts
    const result = await getAlerts();
    
    if (!result.success || !result.alerts) {
      console.error('🔍 API: Failed to get alerts:', result.error);
      return { success: false, error: result.error || 'Failed to get alerts' };
    }
    
    if (result.alerts.length === 0) {
      console.log('🔍 API: No alerts found, skipping notifications');
      return { success: true, alertsCount: 0, emailsSent: 0, message: 'No alerts found' };
    }
    
    // Process alerts and group by painting
    const paintingsWithAlerts = result.alerts.reduce((acc: any[], alert) => {
      const painting = alert.paintings;
      if (!painting) return acc;
      
      const existingGroup = acc.find(group => group.painting.id === painting.id);
      if (existingGroup) {
        existingGroup.alerts.push(alert);
      } else {
        acc.push({
          painting,
          alerts: [alert]
        });
      }
      return acc;
    }, []);
    
    return {
      success: true,
      alertsCount: result.alerts.length,
      emailsSent: 0,
      paintingsWithAlerts
    };
  } catch (error) {
    console.error('🔍 API: Error in checkAlertsAndSendNotifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking alerts',
      alertsCount: 0,
      emailsSent: 0
    };
  }
} 