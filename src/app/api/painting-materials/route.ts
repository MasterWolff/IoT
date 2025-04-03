import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET painting materials associations
export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const paintingId = searchParams.get('paintingId');
    const materialId = searchParams.get('materialId');
    
    // Start building the query
    let query = supabase
      .from('painting_materials')
      .select('*, paintings(*), materials(*)');
    
    // Apply filters if provided
    if (paintingId) {
      query = query.eq('painting_id', paintingId);
    }
    
    if (materialId) {
      query = query.eq('material_id', materialId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching painting materials:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      count: data.length,
      painting_materials: data
    });
  } catch (error) {
    console.error('Error in painting materials API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch painting materials' },
      { status: 500 }
    );
  }
}

// POST to associate a material with a painting
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.painting_id || !body.material_id) {
      return NextResponse.json(
        { error: 'painting_id and material_id are required fields' },
        { status: 400 }
      );
    }
    
    // Prepare data
    const paintingMaterial = {
      painting_id: body.painting_id,
      material_id: body.material_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Check if association already exists
    const { data: existingData, error: existingError } = await supabase
      .from('painting_materials')
      .select('*')
      .eq('painting_id', body.painting_id)
      .eq('material_id', body.material_id);
    
    if (existingError) {
      console.error('Error checking existing painting material:', existingError);
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }
    
    if (existingData && existingData.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This material is already associated with this painting',
        painting_material: existingData[0]
      }, { status: 409 });
    }
    
    // Insert the association
    const { data, error } = await supabase
      .from('painting_materials')
      .insert(paintingMaterial)
      .select();
    
    if (error) {
      console.error('Error creating painting material association:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      painting_material: data[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error in create painting material API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create painting material association' },
      { status: 500 }
    );
  }
} 