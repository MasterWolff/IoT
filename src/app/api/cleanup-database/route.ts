import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Endpoint to clean up the database
export async function POST(request: Request) {
  try {
    // First, get a count of how many rows we have in environmental_data
    const { count: envCount, error: envCountError } = await supabase
      .from('environmental_data')
      .select('*', { count: 'exact', head: true });
    
    if (envCountError) {
      return NextResponse.json({
        success: false,
        error: `Failed to count environmental data: ${envCountError.message}`
      }, { status: 500 });
    }

    // Get a count of how many alerts we have
    const { count: alertCount, error: alertCountError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true });
    
    if (alertCountError && alertCountError.code !== '42P01') { // Ignore table not found error
      return NextResponse.json({
        success: false,
        error: `Failed to count alerts: ${alertCountError.message}`
      }, { status: 500 });
    }
    
    // Delete all alerts first
    let alertsDeleted = 0;
    try {
      const { error: deleteAlertError } = await supabase
        .from('alerts')
        .delete()
        .gte('created_at', '2000-01-01');
      
      if (!deleteAlertError) {
        alertsDeleted = alertCount || 0;
      } else if (deleteAlertError.code !== '42P01') { // Ignore if table doesn't exist
        console.error('Error deleting alerts:', deleteAlertError);
      }
    } catch (alertError) {
      console.error('Failed to delete alerts:', alertError);
      // Continue with environmental data deletion even if alert deletion fails
    }
    
    // Use RPC to execute a SQL command to delete all environmental data
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
      message: 'Database cleaned successfully',
      deletedData: {
        environmentalData: envCount || 0,
        alerts: alertsDeleted
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