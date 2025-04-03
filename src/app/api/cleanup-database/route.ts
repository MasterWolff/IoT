import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Endpoint to clean up the database
export async function POST(request: Request) {
  try {
    // First, get a count of how many rows we have
    const { count, error: countError } = await supabase
      .from('environmental_data')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      return NextResponse.json({
        success: false,
        error: `Failed to count environmental data: ${countError.message}`
      }, { status: 500 });
    }
    
    // Use RPC to execute a SQL command to delete all data
    const { error: deleteError } = await supabase.rpc('clear_environmental_data');
    
    if (deleteError) {
      // If the RPC function doesn't exist, try a normal delete
      console.error('RPC error, falling back to regular delete:', deleteError);
      
      const { error: fallbackError } = await supabase
        .from('environmental_data')
        .delete()
        .gte('created_at', '2000-01-01');
      
      if (fallbackError) {
        return NextResponse.json({
          success: false,
          error: `Failed to delete environmental data: ${fallbackError.message}`
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Environmental data cleaned successfully',
      deletedData: {
        environmentalData: count || 0
      }
    });
  } catch (error) {
    console.error('Error cleaning database:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 