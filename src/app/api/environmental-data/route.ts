import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getLatestEnvironmentalData } from '@/lib/api';

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const paintingId = searchParams.get('paintingId');
    const deviceId = searchParams.get('deviceId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    
    // Start building the query
    let query = supabase
      .from('environmental_data')
      .select('*, paintings(*, painting_materials(materials(*))), devices(*)')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    // Apply filters if provided
    if (paintingId) {
      query = query.eq('painting_id', paintingId);
    }

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching environmental data:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Return the data directly without transformations
    return NextResponse.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error in environmental data API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch environmental data' },
      { status: 500 }
    );
  }
}

// POST to create new environmental data entries
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.painting_id || !body.device_id) {
      return NextResponse.json(
        { error: 'painting_id and device_id are required fields' },
        { status: 400 }
      );
    }
    
    // If we're receiving Arduino data directly, transform it to our schema
    if (Array.isArray(body.arduino_data) && body.arduino_data.length > 0) {
      const arduinoData = body.arduino_data;
      const transformedData = {
        painting_id: body.painting_id,
        device_id: body.device_id,
        timestamp: body.timestamp || new Date().toISOString(),
        temperature: null,
        humidity: null,
        co2concentration: null,
        airpressure: null,
        moldrisklevel: null,
        illuminance: null,
        created_at: new Date().toISOString()
      };
      
      // Map Arduino data to our schema
      for (const prop of arduinoData) {
        switch (prop.variable_name) {
          case 'temperature':
            transformedData.temperature = prop.value;
            break;
          case 'humidity':
            transformedData.humidity = prop.value;
            break;
          case 'co2Concentration':
            transformedData.co2concentration = prop.value;
            break;
          case 'airPressure':
            transformedData.airpressure = prop.value;
            break;
          case 'moldRiskLevel':
            transformedData.moldrisklevel = prop.value;
            break;
          case 'illumination':
          case 'illuminance':
            transformedData.illuminance = prop.value;
            break;
        }
      }
      
      // Insert the transformed data
      const { data, error } = await supabase
        .from('environmental_data')
        .insert(transformedData)
        .select();
      
      if (error) {
        console.error('Error creating environmental data:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
      
      // Update the last_measurement timestamp on the device
      const { error: deviceUpdateError } = await supabase
        .from('devices')
        .update({ 
          last_measurement: transformedData.timestamp,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', body.device_id);
      
      if (deviceUpdateError) {
        console.warn('Error updating device last measurement:', deviceUpdateError);
      }
      
      // After creating the record, check for alerts
      const checkAlertsResponse = await fetch(new URL('/api/check-alerts', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          environmentalDataId: data[0].id
        })
      });
      
      const alertsData = await checkAlertsResponse.json();
      
      return NextResponse.json({
        success: true,
        data: data[0],
        alerts: alertsData
      }, { status: 201 });
    } else {
      // If data is already in the correct format, just insert it directly
      const environmentalData = {
        painting_id: body.painting_id,
        device_id: body.device_id,
        timestamp: body.timestamp || new Date().toISOString(),
        temperature: body.temperature !== undefined ? body.temperature : null,
        humidity: body.humidity !== undefined ? body.humidity : null,
        co2concentration: body.co2concentration !== undefined ? body.co2concentration : null,
        airpressure: body.airpressure !== undefined ? body.airpressure : null,
        moldrisklevel: body.moldrisklevel !== undefined ? body.moldrisklevel : null,
        illuminance: body.illuminance !== undefined ? body.illuminance : null,
        created_at: new Date().toISOString()
      };
      
      // Insert the environmental data
      const { data, error } = await supabase
        .from('environmental_data')
        .insert(environmentalData)
        .select();
      
      if (error) {
        console.error('Error creating environmental data:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
      
      // Update the last_measurement timestamp on the device
      const { error: deviceUpdateError } = await supabase
        .from('devices')
        .update({ 
          last_measurement: environmentalData.timestamp,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', body.device_id);
      
      if (deviceUpdateError) {
        console.warn('Error updating device last measurement:', deviceUpdateError);
      }
      
      // After creating the record, check for alerts
      const checkAlertsResponse = await fetch(new URL('/api/check-alerts', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          environmentalDataId: data[0].id
        })
      });
      
      const alertsData = await checkAlertsResponse.json();
      
      return NextResponse.json({
        success: true,
        data: data[0],
        alerts: alertsData
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in create environmental data API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create environmental data' },
      { status: 500 }
    );
  }
} 