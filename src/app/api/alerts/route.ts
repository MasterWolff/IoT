import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET alerts by checking environmental data against material thresholds
export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const paintingId = searchParams.get('paintingId');
    const deviceId = searchParams.get('deviceId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    
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
    
    // Calculate alerts based on environmental data and material thresholds
    const alerts = [];
    
    for (const data of envData) {
      // Find the painting and its materials
      const painting = paintings.find(p => p.id === data.painting_id);
      if (!painting || !painting.painting_materials) continue;
      
      // Check each material associated with the painting
      for (const pm of painting.painting_materials) {
        if (!pm.materials) continue;
        const material = pm.materials;
        
        // Check temperature thresholds
        if (data.temperature !== null) {
          if ((material.threshold_temperature_lower !== null && 
               data.temperature < material.threshold_temperature_lower) ||
              (material.threshold_temperature_upper !== null && 
               data.temperature > material.threshold_temperature_upper)) {
            
            alerts.push({
              id: `temp-${data.id}-${material.id}`,
              painting_id: data.painting_id,
              device_id: data.device_id,
              environmental_data_id: data.id,
              alert_type: 'temperature',
              threshold_exceeded: data.temperature > material.threshold_temperature_upper ? 'upper' : 'lower',
              measured_value: data.temperature,
              threshold_value: data.temperature > material.threshold_temperature_upper ? 
                material.threshold_temperature_upper : material.threshold_temperature_lower,
              material_id: material.id,
              timestamp: data.timestamp,
              created_at: data.created_at || data.timestamp,
              paintings: painting,
              devices: data.devices,
              materials: material
            });
          }
        }
        
        // Check humidity thresholds
        if (data.humidity !== null) {
          if ((material.threshold_humidity_lower !== null && 
               data.humidity < material.threshold_humidity_lower) ||
              (material.threshold_humidity_upper !== null && 
               data.humidity > material.threshold_humidity_upper)) {
            
            alerts.push({
              id: `hum-${data.id}-${material.id}`,
              painting_id: data.painting_id,
              device_id: data.device_id,
              environmental_data_id: data.id,
              alert_type: 'humidity',
              threshold_exceeded: data.humidity > material.threshold_humidity_upper ? 'upper' : 'lower',
              measured_value: data.humidity,
              threshold_value: data.humidity > material.threshold_humidity_upper ? 
                material.threshold_humidity_upper : material.threshold_humidity_lower,
              material_id: material.id,
              timestamp: data.timestamp,
              created_at: data.created_at || data.timestamp,
              paintings: painting,
              devices: data.devices,
              materials: material
            });
          }
        }
        
        // Check illuminance thresholds
        if (data.illuminance !== null) {
          if ((material.threshold_illuminance_lower !== null && 
               data.illuminance < material.threshold_illuminance_lower) ||
              (material.threshold_illuminance_upper !== null && 
               data.illuminance > material.threshold_illuminance_upper)) {
            
            alerts.push({
              id: `light-${data.id}-${material.id}`,
              painting_id: data.painting_id,
              device_id: data.device_id,
              environmental_data_id: data.id,
              alert_type: 'illuminance',
              threshold_exceeded: data.illuminance > material.threshold_illuminance_upper ? 'upper' : 'lower',
              measured_value: data.illuminance,
              threshold_value: data.illuminance > material.threshold_illuminance_upper ? 
                material.threshold_illuminance_upper : material.threshold_illuminance_lower,
              material_id: material.id,
              timestamp: data.timestamp,
              created_at: data.created_at || data.timestamp,
              paintings: painting,
              devices: data.devices,
              materials: material
            });
          }
        }
        
        // Check CO2 thresholds
        if (data.co2Concentration !== null) {
          if ((material.threshold_co2Concentration_lower !== null && 
               data.co2Concentration < material.threshold_co2Concentration_lower) ||
              (material.threshold_co2Concentration_upper !== null && 
               data.co2Concentration > material.threshold_co2Concentration_upper)) {
            
            alerts.push({
              id: `co2-${data.id}-${material.id}`,
              painting_id: data.painting_id,
              device_id: data.device_id,
              environmental_data_id: data.id,
              alert_type: 'co2Concentration',
              threshold_exceeded: data.co2Concentration > material.threshold_co2Concentration_upper ? 'upper' : 'lower',
              measured_value: data.co2Concentration,
              threshold_value: data.co2Concentration > material.threshold_co2Concentration_upper ? 
                material.threshold_co2Concentration_upper : material.threshold_co2Concentration_lower,
              material_id: material.id,
              timestamp: data.timestamp,
              created_at: data.created_at || data.timestamp,
              paintings: painting,
              devices: data.devices,
              materials: material
            });
          }
        }
        
        // Check mold risk level thresholds
        if (data.moldRiskLevel !== null) {
          if ((material.threshold_moldRiskLevel_lower !== null && 
               data.moldRiskLevel < material.threshold_moldRiskLevel_lower) ||
              (material.threshold_moldRiskLevel_upper !== null && 
               data.moldRiskLevel > material.threshold_moldRiskLevel_upper)) {
            
            alerts.push({
              id: `mold-${data.id}-${material.id}`,
              painting_id: data.painting_id,
              device_id: data.device_id,
              environmental_data_id: data.id,
              alert_type: 'moldRiskLevel',
              threshold_exceeded: data.moldRiskLevel > material.threshold_moldRiskLevel_upper ? 'upper' : 'lower',
              measured_value: data.moldRiskLevel,
              threshold_value: data.moldRiskLevel > material.threshold_moldRiskLevel_upper ? 
                material.threshold_moldRiskLevel_upper : material.threshold_moldRiskLevel_lower,
              material_id: material.id,
              timestamp: data.timestamp,
              created_at: data.created_at || data.timestamp,
              paintings: painting,
              devices: data.devices,
              materials: material
            });
          }
        }
      }
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