import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.device_id || !body.thing_id) {
      return NextResponse.json(
        { error: 'device_id and thing_id are required fields' },
        { status: 400 }
      );
    }
    
    // Update the device with the thing ID
    const { data, error } = await supabase
      .from('devices')
      .update({ 
        arduino_thing_id: body.thing_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.device_id)
      .select();
    
    if (error) {
      console.error('Error updating device thing ID:', error);
      
      // If column doesn't exist, try to add it
      if (error.message && error.message.includes('column "arduino_thing_id" does not exist')) {
        // Try to add the column first
        try {
          await supabase.rpc('add_arduino_thing_id_column');
          
          // Retry the update
          const { data: retryData, error: retryError } = await supabase
            .from('devices')
            .update({ 
              arduino_thing_id: body.thing_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', body.device_id)
            .select();
            
          if (retryError) {
            return NextResponse.json(
              { error: retryError.message },
              { status: 500 }
            );
          }
          
          return NextResponse.json({
            success: true,
            message: 'Added column and updated device thing ID',
            device: retryData[0]
          });
        } catch (columnError) {
          console.error('Failed to add column:', columnError);
          return NextResponse.json(
            { error: 'The arduino_thing_id column does not exist in the devices table and could not be added.' },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Device thing ID updated successfully',
      device: data[0]
    });
  } catch (error) {
    console.error('Error in update thing API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update device thing ID' },
      { status: 500 }
    );
  }
} 