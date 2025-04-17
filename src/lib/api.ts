import { supabase } from './supabase';
import type { Painting, Material, Device, EnvironmentalData } from './supabase';
import type { AlertInfo } from './emailService';
import { PROPERTY_MAPPINGS } from './propertyMapper';

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
  });
  
  return alerts;
}

// Check for alerts and send email notifications if thresholds are exceeded
export async function checkAlertsAndNotify() {
  try {
    console.log('🔍 EMAIL CHECK: Starting to check for alerts that need email notifications...');
    
    const alerts = await getAlerts();
    if (!alerts || alerts.length === 0) {
      console.log('🔍 EMAIL CHECK: No alerts detected at this time.');
      return { success: true, alertsCount: 0 };
    }
    
    console.log(`🔍 EMAIL CHECK: Found ${alerts.length} alerts that may require notification.`);
    
    // Lazy import to avoid circular dependencies
    console.log('🔍 EMAIL CHECK: Importing email service...');
    const { sendAlertEmail } = await import('./emailService');
    console.log('🔍 EMAIL CHECK: Email service imported successfully');
    
    let emailsSent = 0;
    let attemptedEmails = 0;
    
    // Log email configuration
    const { emailConfig, isEmailConfigured } = await import('./emailConfig');
    const emailConfigured = isEmailConfigured();
    console.log('🔍 EMAIL CHECK: Email configuration status:', { 
      isConfigured: emailConfigured,
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      hasUser: !!emailConfig.smtp.auth.user,
      hasPassword: !!emailConfig.smtp.auth.pass,
      from: emailConfig.from,
      recipients: emailConfig.alertRecipients 
    });
    
    if (!emailConfigured) {
      console.error('❌ EMAIL CHECK: Email is not configured properly. Cannot send notifications.');
      return { success: false, alertsCount: alerts.length, emailsSent: 0, error: 'Email is not configured properly' };
    }
    
    // Process each alert
    console.log('🔍 EMAIL CHECK: Starting to process alerts...');
    for (const alertData of alerts) {
      const painting = alertData.paintings;
      if (!painting) {
        console.log('🔍 EMAIL CHECK: Alert has no painting data, skipping:', alertData.id);
        continue;
      }
      
      console.log(`🔍 EMAIL CHECK: Processing alert for painting: ${painting.name} (${painting.id})`);
      
      // Log materials info
      const materialsCount = painting.painting_materials?.length || 0;
      console.log(`🔍 EMAIL CHECK: Painting has ${materialsCount} materials to check thresholds against`);
      
      // For each affected material, prepare and send an alert
      for (const pm of painting.painting_materials || []) {
        const material = pm.materials;
        if (!material) {
          console.log('🔍 EMAIL CHECK: Painting material has no materials data, skipping');
          continue;
        }
        
        console.log(`🔍 EMAIL CHECK: Checking thresholds for material: ${material.name || 'Unknown'}`);
        
        // Check which threshold was exceeded and prepare alert information
        if (alertData.temperature !== null) {
          console.log(`🔍 EMAIL CHECK: Checking temperature: ${alertData.temperature}°C against thresholds [${material.threshold_temperature_lower}-${material.threshold_temperature_upper}]`);
          
          if ((material.threshold_temperature_lower !== null && alertData.temperature < material.threshold_temperature_lower) ||
              (material.threshold_temperature_upper !== null && alertData.temperature > material.threshold_temperature_upper)) {
            
            console.log(`🔍 EMAIL CHECK: Temperature threshold exceeded for ${painting.name}`);
            
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
            
            console.log(`🔍 EMAIL CHECK: Attempting to send temperature alert email for ${painting.name}`);
            attemptedEmails++;
            const sent = await sendAlertEmail(alertInfo);
            console.log(`🔍 EMAIL CHECK: Temperature alert email ${sent ? 'sent successfully' : 'failed to send'}`);
            if (sent) emailsSent++;
          } else {
            console.log(`🔍 EMAIL CHECK: Temperature values within acceptable range for ${painting.name}`);
          }
        }
        
        // Check humidity threshold
        if (alertData.humidity !== null) {
          console.log(`🔍 EMAIL CHECK: Checking humidity: ${alertData.humidity}% against thresholds [${material.threshold_humidity_lower}-${material.threshold_humidity_upper}]`);
          
          if ((material.threshold_humidity_lower !== null && alertData.humidity < material.threshold_humidity_lower) ||
              (material.threshold_humidity_upper !== null && alertData.humidity > material.threshold_humidity_upper)) {
            
            console.log(`🔍 EMAIL CHECK: Humidity threshold exceeded for ${painting.name}`);
            
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
            
            console.log(`🔍 EMAIL CHECK: Attempting to send humidity alert email for ${painting.name}`);
            attemptedEmails++;
            const sent = await sendAlertEmail(alertInfo);
            console.log(`🔍 EMAIL CHECK: Humidity alert email ${sent ? 'sent successfully' : 'failed to send'}`);
            if (sent) emailsSent++;
          } else {
            console.log(`🔍 EMAIL CHECK: Humidity values within acceptable range for ${painting.name}`);
          }
        }
        
        // Check illuminance threshold
        if (alertData.illuminance !== null || alertData.illumination !== null) {
          // Get illuminance value from the right field
          const illuminanceValue = alertData.illuminance !== null ? alertData.illuminance : alertData.illumination;
          
          console.log(`🔍 EMAIL CHECK: Checking illuminance: ${illuminanceValue} lux against thresholds [${material.threshold_illuminance_lower}-${material.threshold_illuminance_upper}]`);
          
          if ((material.threshold_illuminance_lower !== null && illuminanceValue < material.threshold_illuminance_lower) ||
              (material.threshold_illuminance_upper !== null && illuminanceValue > material.threshold_illuminance_upper)) {
            
            console.log(`🔍 EMAIL CHECK: Illuminance threshold exceeded for ${painting.name}`);
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'illuminance',
                value: illuminanceValue,
                unit: 'lux'
              },
              threshold: {
                lower: material.threshold_illuminance_lower,
                upper: material.threshold_illuminance_upper
              },
              timestamp: alertData.timestamp
            };
            
            console.log(`🔍 EMAIL CHECK: Attempting to send illuminance alert email for ${painting.name}`);
            attemptedEmails++;
            const sent = await sendAlertEmail(alertInfo);
            console.log(`🔍 EMAIL CHECK: Illuminance alert email ${sent ? 'sent successfully' : 'failed to send'}`);
            if (sent) emailsSent++;
          }
        }
        
        // Check CO2 threshold
        if (alertData.co2 !== null || alertData.co2concentration !== null) {
          // Get CO2 value from the right field - could be in either co2 or co2concentration
          const co2Value = alertData.co2 !== null ? alertData.co2 : alertData.co2concentration;
          
          // Set default CO2 threshold of 600 ppm if no material threshold is set
          const co2LowerThreshold = material.threshold_co2concentration_lower;
          const co2UpperThreshold = material.threshold_co2concentration_upper !== null ? material.threshold_co2concentration_upper : 600;
          
          console.log(`🔍 EMAIL CHECK: Checking CO2: ${co2Value} ppm against thresholds [${co2LowerThreshold}-${co2UpperThreshold}] (${co2UpperThreshold === 600 && material.threshold_co2concentration_upper === null ? 'using default upper threshold' : 'using material threshold'})`);
          
          // Extra debugging for CO2 values
          console.log('🔍 EMAIL CHECK: CO2 threshold details:', {
            co2Value,
            co2Field: alertData.co2 !== null ? 'co2' : 'co2concentration',
            lowerThreshold: co2LowerThreshold,
            upperThreshold: co2UpperThreshold,
            usingDefaultThreshold: co2UpperThreshold === 600 && material.threshold_co2concentration_upper === null,
            hasLowerThreshold: co2LowerThreshold !== null,
            hasUpperThreshold: co2UpperThreshold !== null,
            exceedsLower: co2LowerThreshold !== null && co2Value < co2LowerThreshold,
            exceedsUpper: co2UpperThreshold !== null && co2Value > co2UpperThreshold
          });
          
          if ((co2LowerThreshold !== null && co2Value < co2LowerThreshold) ||
              (co2UpperThreshold !== null && co2Value > co2UpperThreshold)) {
            
            console.log(`🔍 EMAIL CHECK: CO2 threshold exceeded for ${painting.name}`);
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'co2',
                value: co2Value,
                unit: 'ppm'
              },
              threshold: {
                lower: co2LowerThreshold,
                upper: co2UpperThreshold
              },
              timestamp: alertData.timestamp
            };
            
            console.log(`🔍 EMAIL CHECK: Attempting to send CO2 alert email for ${painting.name}`);
            attemptedEmails++;
            const sent = await sendAlertEmail(alertInfo);
            console.log(`🔍 EMAIL CHECK: CO2 alert email ${sent ? 'sent successfully' : 'failed to send'}`);
            if (sent) emailsSent++;
          } else {
            console.log(`🔍 EMAIL CHECK: CO2 values within acceptable range for ${painting.name}`);
          }
        }
        
        // Check air pressure threshold
        if (alertData.air_pressure !== null || alertData.airpressure !== null) {
          // Get air pressure value from the right field
          const airPressureValue = alertData.air_pressure !== null ? alertData.air_pressure : alertData.airpressure;
          
          console.log(`🔍 EMAIL CHECK: Checking air pressure: ${airPressureValue} hPa against thresholds [${material.threshold_airpressure_lower}-${material.threshold_airpressure_upper}]`);
          
          if ((material.threshold_airpressure_lower !== null && airPressureValue < material.threshold_airpressure_lower) ||
              (material.threshold_airpressure_upper !== null && airPressureValue > material.threshold_airpressure_upper)) {
            
            console.log(`🔍 EMAIL CHECK: Air pressure threshold exceeded for ${painting.name}`);
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'air_pressure',
                value: airPressureValue,
                unit: 'hPa'
              },
              threshold: {
                lower: material.threshold_airpressure_lower,
                upper: material.threshold_airpressure_upper
              },
              timestamp: alertData.timestamp
            };
            
            console.log(`🔍 EMAIL CHECK: Attempting to send air pressure alert email for ${painting.name}`);
            attemptedEmails++;
            const sent = await sendAlertEmail(alertInfo);
            console.log(`🔍 EMAIL CHECK: Air pressure alert email ${sent ? 'sent successfully' : 'failed to send'}`);
            if (sent) emailsSent++;
          }
        }
        
        // Check mold risk threshold
        if (alertData.mold_risk_level !== null || alertData.moldrisklevel !== null) {
          // Get mold risk value from the right field - could be in either mold_risk_level or moldrisklevel
          const moldRiskValue = alertData.mold_risk_level !== null ? alertData.mold_risk_level : alertData.moldrisklevel;
          
          console.log(`🔍 EMAIL CHECK: Checking mold risk: ${moldRiskValue} against thresholds [${material.threshold_moldrisklevel_lower}-${material.threshold_moldrisklevel_upper}]`);
          
          if ((material.threshold_moldrisklevel_lower !== null && moldRiskValue < material.threshold_moldrisklevel_lower) ||
              (material.threshold_moldrisklevel_upper !== null && moldRiskValue > material.threshold_moldrisklevel_upper)) {
            
            console.log(`🔍 EMAIL CHECK: Mold risk threshold exceeded for ${painting.name}`);
            
            const alertInfo: AlertInfo = {
              id: alertData.id,
              paintingId: painting.id,
              paintingName: painting.name,
              artist: painting.artist,
              measurement: {
                type: 'mold_risk_level',
                value: moldRiskValue,
                unit: ''
              },
              threshold: {
                lower: material.threshold_moldrisklevel_lower,
                upper: material.threshold_moldrisklevel_upper
              },
              timestamp: alertData.timestamp
            };
            
            console.log(`🔍 EMAIL CHECK: Attempting to send mold risk alert email for ${painting.name}`);
            attemptedEmails++;
            const sent = await sendAlertEmail(alertInfo);
            console.log(`🔍 EMAIL CHECK: Mold risk alert email ${sent ? 'sent successfully' : 'failed to send'}`);
            if (sent) emailsSent++;
          } else {
            console.log(`🔍 EMAIL CHECK: Mold risk values within acceptable range for ${painting.name}`);
          }
        }
      }
    }
    
    // Final result
    console.log(`🔍 EMAIL CHECK: Completed alert checking. Attempted ${attemptedEmails} emails, successfully sent ${emailsSent}.`);
    
    return { 
      success: true, 
      alertsCount: alerts.length,
      emailsSent,
      attemptedEmails
    };
  } catch (error) {
    console.error('❌ EMAIL CHECK: Error checking alerts and sending notifications:', error);
    if (error instanceof Error) {
      console.error('❌ EMAIL CHECK: Error details:', error.message);
      console.error('❌ EMAIL CHECK: Error stack:', error.stack);
    }
    return { 
      success: false, 
      error: `Failed to process alerts: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 