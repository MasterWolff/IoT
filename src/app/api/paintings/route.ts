import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all paintings
export async function GET(request: Request) {
  try {
    // Extract query parameters for potential filtering
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist');
    const name = searchParams.get('name');
    
    // Start building the query
    let query = supabase
      .from('paintings')
      .select('*, painting_materials(materials(*))')
      .order('name');
    
    // Apply filters if provided
    if (artist) {
      query = query.ilike('artist', `%${artist}%`);
    }
    
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching paintings:', error);
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      count: data.length,
      paintings: data
    });
  } catch (error) {
    console.error('Error in paintings API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch paintings' },
      { status: 500 }
    );
  }
}

// POST to create a new painting
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.artist) {
      return NextResponse.json(
        { error: 'Name and artist are required fields' },
        { status: 400 }
      );
    }
    
    // Prepare data with timestamps
    const painting = {
      name: body.name,
      artist: body.artist,
      year: body.year || null,
      description: body.description || null,
      image_url: body.image_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the painting
    const { data, error } = await supabase
      .from('paintings')
      .insert(painting)
      .select();
    
    if (error) {
      console.error('Error creating painting:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      painting: data[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error in create painting API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create painting' },
      { status: 500 }
    );
  }
} 