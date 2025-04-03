import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database tables
export type Painting = {
  id: string;
  name: string;
  artist: string;
  creation_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  name: string;
  max_allowable_airPressure_change: number | null;
  threshold_co2Concentration_lower: number | null;
  threshold_co2Concentration_upper: number | null;
  threshold_humidity_lower: number | null;
  threshold_humidity_upper: number | null;
  threshold_illuminance_lower: number | null;
  threshold_illuminance_upper: number | null;
  threshold_temperature_lower: number | null;
  threshold_temperature_upper: number | null;
  threshold_moldRiskLevel_lower: number | null;
  threshold_moldRiskLevel_upper: number | null;
  created_at: string;
  updated_at: string;
};

export type PaintingMaterial = {
  painting_id: string;
  material_id: string;
  created_at: string;
};

export type Device = {
  id: string;
  painting_id: string | null;
  last_calibration_date: string | null;
  last_measurement: string | null;
  created_at: string;
  updated_at: string;
};

export type EnvironmentalData = {
  id: string;
  painting_id: string;
  device_id: string;
  timestamp: string;
  airPressure: number | null;
  co2Concentration: number | null;
  humidity: number | null;
  illuminance: number | null;
  temperature: number | null;
  moldRiskLevel: number | null;
  created_at: string;
}; 