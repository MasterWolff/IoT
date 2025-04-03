import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Check the structure by selecting a single row
    const { data, error } = await supabase
      .from('environmental_data')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching data:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    // Get column names from the data
    const columnNames = data && data.length > 0 
      ? Object.keys(data[0]) 
      : [];
    
    // Get more info about the table structure using RPC if available
    let tableInfo = null;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_table_columns', 
        { table_name: 'environmental_data' }
      );
      
      if (!rpcError) {
        tableInfo = rpcData;
      }
    } catch (e) {
      console.log('RPC not available, using basic column info');
    }
    
    return NextResponse.json({
      success: true,
      columnNames,
      sampleData: data && data.length > 0 ? data[0] : null,
      tableInfo
    });
  } catch (error) {
    console.error('Error checking table structure:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 