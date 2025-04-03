import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all materials
export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    // Start building the query
    let query = supabase
      .from('materials')
      .select('*')
      .order('name');
    
    // Apply filters if provided
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching materials:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      count: data.length,
      materials: data
    });
  } catch (error) {
    console.error('Error in materials API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

// POST to create a new material
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is a required field' },
        { status: 400 }
      );
    }
    
    // Prepare data with all threshold fields
    const material = {
      name: body.name,
      max_allowable_airPressure_change: body.max_allowable_airPressure_change || null,
      threshold_co2Concentration_lower: body.threshold_co2Concentration_lower || null,
      threshold_co2Concentration_upper: body.threshold_co2Concentration_upper || null,
      threshold_humidity_lower: body.threshold_humidity_lower || null,
      threshold_humidity_upper: body.threshold_humidity_upper || null,
      threshold_illuminance_lower: body.threshold_illuminance_lower || null,
      threshold_illuminance_upper: body.threshold_illuminance_upper || null,
      threshold_temperature_lower: body.threshold_temperature_lower || null,
      threshold_temperature_upper: body.threshold_temperature_upper || null,
      threshold_moldRiskLevel_lower: body.threshold_moldRiskLevel_lower || null,
      threshold_moldRiskLevel_upper: body.threshold_moldRiskLevel_upper || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the material
    const { data, error } = await supabase
      .from('materials')
      .insert(material)
      .select();
    
    if (error) {
      console.error('Error creating material:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      material: data[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error in create material API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create material' },
      { status: 500 }
    );
  }
} 