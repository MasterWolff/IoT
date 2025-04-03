import { supabase } from './supabase';
import type { Painting, Material, Device, EnvironmentalData } from './supabase';

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
      if (data.co2Concentration !== null && 
          ((material.threshold_co2Concentration_lower !== null && data.co2Concentration < material.threshold_co2Concentration_lower) ||
           (material.threshold_co2Concentration_upper !== null && data.co2Concentration > material.threshold_co2Concentration_upper))) {
        return true;
      }
      
      // Check mold risk
      if (data.moldRiskLevel !== null && 
          ((material.threshold_moldRiskLevel_lower !== null && data.moldRiskLevel < material.threshold_moldRiskLevel_lower) ||
           (material.threshold_moldRiskLevel_upper !== null && data.moldRiskLevel > material.threshold_moldRiskLevel_upper))) {
        return true;
      }
    }
    
    return false;
  });
  
  return alerts;
} 