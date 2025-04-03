import { supabase } from './supabase';
import type { Painting, Material, Device, EnvironmentalData } from './supabase';
import type { AlertInfo } from './emailService';

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
  
  return data;
}

// Check for alerts based on environmental data and material thresholds
export async function getAlerts() {
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
    return [];
  }
  
  // Process data to find measurements that exceed thresholds
  const alerts = envData.filter(data => {
    const painting = data.paintings;
    if (!painting || !painting.painting_materials || painting.painting_materials.length === 0) {
      return false;
    }
    
    // Check against thresholds for all materials of the painting
    for (const pm of painting.painting_materials) {
      const material = pm.materials;
      if (!material) continue;
      
      // Check temperature
      if (data.temperature !== null && 
          ((material.threshold_temperature_lower !== null && data.temperature < material.threshold_temperature_lower) ||
           (material.threshold_temperature_upper !== null && data.temperature > material.threshold_temperature_upper))) {
        return true;
      }
      
      // Check humidity
      if (data.humidity !== null && 
          ((material.threshold_humidity_lower !== null && data.humidity < material.threshold_humidity_lower) ||
           (material.threshold_humidity_upper !== null && data.humidity > material.threshold_humidity_upper))) {
        return true;
      }
      
      // Check illuminance
      if (data.illuminance !== null && 
          ((material.threshold_illuminance_lower !== null && data.illuminance < material.threshold_illuminance_lower) ||
           (material.threshold_illuminance_upper !== null && data.illuminance > material.threshold_illuminance_upper))) {
        return true;
      }
      
      // Check CO2
      if (data.co2 !== null && 
          ((material.threshold_co2_lower !== null && data.co2 < material.threshold_co2_lower) ||
           (material.threshold_co2_upper !== null && data.co2 > material.threshold_co2_upper))) {
        return true;
      }
      
      // Check mold risk
      if (data.mold_risk_level !== null && 
          ((material.threshold_mold_risk_level_lower !== null && data.mold_risk_level < material.threshold_mold_risk_level_lower) ||
           (material.threshold_mold_risk_level_upper !== null && data.mold_risk_level > material.threshold_mold_risk_level_upper))) {
        return true;
      }
    }
    
    return false;
  });
  
  return alerts;
}

// Check for alerts and send email notifications if thresholds are exceeded
export async function checkAlertsAndNotify() {
  try {
    const alerts = await getAlerts();
    if (!alerts || alerts.length === 0) {
      console.log('No alerts detected at this time.');
      return { success: true, alertsCount: 0 };
    }
    
    console.log(`Found ${alerts.length} alerts that may require notification.`);
    
    // Lazy import to avoid circular dependencies
    const { sendAlertEmail } = await import('./emailService');
    
    let emailsSent = 0;
    
    // Process each alert
    for (const alertData of alerts) {
      const painting = alertData.paintings;
      if (!painting) continue;
      
      // For each affected material, prepare and send an alert
      for (const pm of painting.painting_materials || []) {
        const material = pm.materials;
        if (!material) continue;
        
        // Check which threshold was exceeded and prepare alert information
        if (alertData.temperature !== null) {
          if ((material.threshold_temperature_lower !== null && alertData.temperature < material.threshold_temperature_lower) ||
              (material.threshold_temperature_upper !== null && alertData.temperature > material.threshold_temperature_upper)) {
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'temperature',
                value: alertData.temperature,
                unit: '°C'
              },
              threshold: {
                lower: material.threshold_temperature_lower,
                upper: material.threshold_temperature_upper
              },
              timestamp: alertData.timestamp
            };
            
            const sent = await sendAlertEmail(alertInfo);
            if (sent) emailsSent++;
          }
        }
        
        // Check humidity threshold
        if (alertData.humidity !== null) {
          if ((material.threshold_humidity_lower !== null && alertData.humidity < material.threshold_humidity_lower) ||
              (material.threshold_humidity_upper !== null && alertData.humidity > material.threshold_humidity_upper)) {
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'humidity',
                value: alertData.humidity,
                unit: '%'
              },
              threshold: {
                lower: material.threshold_humidity_lower,
                upper: material.threshold_humidity_upper
              },
              timestamp: alertData.timestamp
            };
            
            const sent = await sendAlertEmail(alertInfo);
            if (sent) emailsSent++;
          }
        }
        
        // Check illuminance threshold
        if (alertData.illuminance !== null) {
          if ((material.threshold_illuminance_lower !== null && alertData.illuminance < material.threshold_illuminance_lower) ||
              (material.threshold_illuminance_upper !== null && alertData.illuminance > material.threshold_illuminance_upper)) {
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'illuminance',
                value: alertData.illuminance,
                unit: 'lux'
              },
              threshold: {
                lower: material.threshold_illuminance_lower,
                upper: material.threshold_illuminance_upper
              },
              timestamp: alertData.timestamp
            };
            
            const sent = await sendAlertEmail(alertInfo);
            if (sent) emailsSent++;
          }
        }
        
        // Check CO2 threshold
        if (alertData.co2 !== null) {
          if ((material.threshold_co2_lower !== null && alertData.co2 < material.threshold_co2_lower) ||
              (material.threshold_co2_upper !== null && alertData.co2 > material.threshold_co2_upper)) {
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'co2',
                value: alertData.co2,
                unit: 'ppm'
              },
              threshold: {
                lower: material.threshold_co2_lower,
                upper: material.threshold_co2_upper
              },
              timestamp: alertData.timestamp
            };
            
            const sent = await sendAlertEmail(alertInfo);
            if (sent) emailsSent++;
          }
        }
        
        // Check air pressure threshold
        if (alertData.air_pressure !== null) {
          if ((material.threshold_air_pressure_lower !== null && alertData.air_pressure < material.threshold_air_pressure_lower) ||
              (material.threshold_air_pressure_upper !== null && alertData.air_pressure > material.threshold_air_pressure_upper)) {
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'air_pressure',
                value: alertData.air_pressure,
                unit: 'hPa'
              },
              threshold: {
                lower: material.threshold_air_pressure_lower,
                upper: material.threshold_air_pressure_upper
              },
              timestamp: alertData.timestamp
            };
            
            const sent = await sendAlertEmail(alertInfo);
            if (sent) emailsSent++;
          }
        }
        
        // Check mold risk threshold
        if (alertData.mold_risk_level !== null) {
          if ((material.threshold_mold_risk_level_lower !== null && alertData.mold_risk_level < material.threshold_mold_risk_level_lower) ||
              (material.threshold_mold_risk_level_upper !== null && alertData.mold_risk_level > material.threshold_mold_risk_level_upper)) {
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'mold_risk_level',
                value: alertData.mold_risk_level,
                unit: ''
              },
              threshold: {
                lower: material.threshold_mold_risk_level_lower,
                upper: material.threshold_mold_risk_level_upper
              },
              timestamp: alertData.timestamp
            };
            
            const sent = await sendAlertEmail(alertInfo);
            if (sent) emailsSent++;
          }
        }
      }
    }
    
    return { 
      success: true, 
      alertsCount: alerts.length,
      emailsSent
    };
  } catch (error) {
    console.error('Error checking alerts and sending notifications:', error);
    return { 
      success: false, 
      error: `Failed to process alerts: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 