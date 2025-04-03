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
  max_allowable_airpressure_change: number | null;
  threshold_co2concentration_lower: number | null;
  threshold_co2concentration_upper: number | null;
  threshold_humidity_lower: number | null;
  threshold_humidity_upper: number | null;
  threshold_temperature_lower: number | null;
  threshold_temperature_upper: number | null;
  threshold_moldrisklevel_lower: number | null;
  threshold_moldrisklevel_upper: number | null;
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
  arduino_device_id: string | null; // Arduino Cloud Device ID
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
  airpressure: number | null;
  co2: number | null;
  humidity: number | null;
  illuminance: number | null;
  temperature: number | null;
  mold_risk_level: number | null;
  created_at: string;
  updated_at: string;
};

// New type for storing alert records
export type AlertRecord = {
  id: string;
  painting_id: string;
  device_id: string | null;
  environmental_data_id: string | null;
  alert_type: string; // temperature, humidity, co2, mold_risk_level, airpressure
  threshold_exceeded: 'upper' | 'lower';
  measured_value: number;
  threshold_value: number;
  status: 'active' | 'dismissed';
  timestamp: string;
  created_at: string;
  updated_at: string | null;
  dismissed_at: string | null;
}; 