import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const paintingId = searchParams.get('paintingId');
    const format = searchParams.get('format') || 'json'; // Default to JSON
    
    if (!paintingId) {
      return NextResponse.json(
        { error: 'paintingId is required' },
        { status: 400 }
      );
    }
    
    // Fetch all environmental data for the painting
    const { data, error } = await supabase
      .from('environmental_data')
      .select('*')
      .eq('painting_id', paintingId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching environmental data:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'id', 
        'painting_id', 
        'device_id', 
        'timestamp', 
        'temperature', 
        'humidity', 
        'co2concentration', 
        'airpressure', 
        'moldrisklevel', 
        'illuminance', 
        'created_at', 
        'updated_at'
      ];
      
      const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => {
          return headers.map(header => {
            // Handle null values and ensure proper CSV escaping
            const value = row[header as keyof typeof row];
            if (value === null || value === undefined) return '';
            // Escape quotes and wrap in quotes if the value contains a comma
            const stringValue = String(value);
            return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
          }).join(',');
        })
      ];
      
      const csv = csvRows.join('\n');
      
      // Return CSV with appropriate headers
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="environmental-data-${paintingId}.csv"`
        }
      });
    } else {
      // Return JSON
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="environmental-data-${paintingId}.json"`
        }
      });
    }
  } catch (error) {
    console.error('Error in download environmental data API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download environmental data' },
      { status: 500 }
    );
  }
} 