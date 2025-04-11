import { storeSensorData } from './api';
import { supabase } from './supabase';
import type { EnvironmentalData } from './supabase';
import { mapArduinoToDatabaseProperties } from './propertyMapper';

interface ArduinoCloudCredentials {
  clientId: string | undefined;
  clientSecret: string | undefined;
  token?: string;
  tokenExpiry?: number;
}

interface ArduinoCloudProperty {
  id: string;
  name: string;
  value?: any;
  last_value?: any;
  variable_name?: string;
  type?: string;
  updated_at: string;
}

interface ArduinoCloudDevice {
  id: string;
  name: string;
  properties?: ArduinoCloudProperty[];
  thing_id?: string;
  href?: string;
}

/**
 * Helper class for interacting with Arduino Cloud API
 */
export class ArduinoCloudClient {
  private credentials: ArduinoCloudCredentials;
  private baseUrl = 'https://api2.arduino.cc/iot';
  
  constructor(
    clientId: string | undefined, 
    clientSecret: string | undefined
  ) {
    if (!clientId || !clientSecret) {
      throw new Error('Arduino Cloud credentials are required');
    }
    
    this.credentials = {
      clientId,
      clientSecret
    };
  }
  
  /**
   * Get an access token from Arduino Cloud
   */
  private async getToken(): Promise<string> {
    // Check if we have a valid token
    const now = Date.now();
    if (this.credentials.token && this.credentials.tokenExpiry && this.credentials.tokenExpiry > now) {
      return this.credentials.token;
    }
    
    // Ensure we have valid credentials
    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      throw new Error('Arduino Cloud credentials are missing or invalid');
    }
    
    // Request a new token
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.credentials.clientId);
    params.append('client_secret', this.credentials.clientSecret);
    params.append('audience', 'https://api2.arduino.cc/iot');
    
    const response = await fetch('https://api2.arduino.cc/iot/v1/clients/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.statusText}`);
    }
    
    const tokenData = await response.json();
    
    // Store the token and its expiry time
    this.credentials.token = tokenData.access_token;
    this.credentials.tokenExpiry = now + (tokenData.expires_in * 1000);
    
    // The token should always be defined at this point
    return this.credentials.token || ''; // Add fallback to empty string to satisfy TypeScript
  }
  
  /**
   * Make an authenticated request to Arduino Cloud API
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Arduino Cloud API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Get a list of all devices in Arduino Cloud
   */
  async getDevices(): Promise<ArduinoCloudDevice[]> {
    try {
      console.log('Fetching devices from Arduino Cloud v1 API');
      // Get all things first (contains the device info we need)
      const things = await this.request('/v1/things');
      console.log('Things response:', things);
      
      if (Array.isArray(things)) {
        console.log(`Got ${things.length} things from API`);
        // Map things to our device format
        const devices = things.map(thing => {
          console.log(`Processing thing: ${thing.id}, device: ${thing.device_id || 'none'}`);
          return {
            id: thing.device_id || '', // Use device_id from thing
            name: thing.device_name || thing.name || 'Unknown Device',
            thing_id: thing.id, // The thing ID is what we need for properties
            properties: [],
            href: thing.href
          };
        });
        
        console.log(`Returning ${devices.length} devices`);
        return devices;
      } else {
        console.warn('API response is not an array:', things);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }
  
  /**
   * Get detailed information about a specific device/thing
   */
  async getDevice(deviceId: string, thingId?: string): Promise<ArduinoCloudDevice> {
    // If we have a thing ID, prefer to use that
    if (thingId) {
      const thing = await this.request(`/v1/things/${thingId}`);
      return {
        id: thing.device_id || deviceId,
        name: thing.device_name || thing.name || 'Unknown Device',
        thing_id: thing.id,
        properties: [],
        href: thing.href
      };
    }
    
    // Otherwise, try to get device info directly
    try {
      // First try the v1 API
      const things = await this.request('/v1/things');
      if (Array.isArray(things)) {
        const thing = things.find(t => t.device_id === deviceId);
        if (thing) {
          return {
            id: deviceId,
            name: thing.device_name || thing.name || 'Unknown Device',
            thing_id: thing.id,
            properties: [],
            href: thing.href
          };
        }
      }
      
      // Fallback to v2 API
      const device = await this.request(`/devices/${deviceId}`);
      return device;
    } catch (error) {
      console.error('Error fetching device:', error);
      return { id: deviceId, name: 'Unknown Device', properties: [] };
    }
  }
  
  /**
   * Get the properties for a specific device
   */
  async getDeviceProperties(thingId: string): Promise<ArduinoCloudProperty[]> {
    console.log(`Fetching properties for Thing ID: ${thingId}`);
    try {
      const response = await this.request(`/v1/things/${thingId}/properties`);
      console.log('Properties API response:', response);
      
      // Handle different response formats
      if (Array.isArray(response)) {
        console.log(`Response is an array with ${response.length} properties`);
        return response.map(prop => ({
          id: prop.id,
          name: prop.name || prop.variable_name || 'Unknown',
          variable_name: prop.variable_name,
          value: prop.last_value,
          last_value: prop.last_value,
          type: prop.type || 'unknown',
          updated_at: prop.value_updated_at || new Date().toISOString()
        }));
      } else if (response && typeof response === 'object') {
        // If it's not an array but an object, convert it to an array
        console.log('Properties response is an object, not an array');
        
        // Try to extract properties from the response object
        if (response.properties && Array.isArray(response.properties)) {
          console.log(`Found properties array in response with ${response.properties.length} items`);
          return response.properties;
        }
        
        // Or convert the object to an array if it has entries
        console.log('Converting object to array');
        const propertiesArray = Object.entries(response).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return {
              id: (value as any).id || key,
              name: (value as any).name || key,
              variable_name: (value as any).variable_name,
              last_value: (value as any).last_value,
              type: (value as any).type || 'unknown',
              updated_at: (value as any).updated_at || (value as any).value_updated_at
            };
          }
          return {
            id: key,
            name: key,
            value: value,
            updated_at: new Date().toISOString()
          };
        });
        
        return propertiesArray;
      }
      
      // If all else fails, return an empty array
      console.warn('Unable to parse properties response:', response);
      return [];
    } catch (error) {
      console.error(`Error in getDeviceProperties for Thing ID ${thingId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the series data for a specific property
   */
  async getPropertyTimeSeries(deviceId: string, propertyId: string, from?: Date, to?: Date): Promise<any> {
    let url = `/series/deviceId=${deviceId}&propertyId=${propertyId}`;
    
    if (from) {
      url += `&from=${from.toISOString()}`;
    }
    
    if (to) {
      url += `&to=${to.toISOString()}`;
    }
    
    return this.request(url);
  }
  
  /**
   * Find the painting associated with a device in the database
   */
  private async getDevicePainting(deviceId: string): Promise<string | null> {
    // Look up the device in the database
    const { data, error } = await supabase
      .from('devices')
      .select('painting_id')
      .eq('id', deviceId)
      .single();
    
    if (error || !data || !data.painting_id) {
      console.error('Error finding painting for device:', deviceId, error);
      return null;
    }
    
    return data.painting_id;
  }
  
  /**
   * Fetch sensor data from Arduino Cloud and store it in the database
   * @param deviceId The ID of the device in our database
   * @param thingId The Arduino Thing ID to use for fetching properties
   */
  async fetchAndStoreSensorData(deviceId: string, thingId: string): Promise<any> {
    try {
      // Find the painting ID for this device from the database
      const paintingId = await this.getDevicePainting(deviceId);
      
      if (!paintingId) {
        throw new Error(`No painting associated with device: ${deviceId}`);
      }
      
      // Map Arduino Cloud properties to our database schema
      const data: Partial<EnvironmentalData> = {
        device_id: deviceId,
        painting_id: paintingId,
        timestamp: new Date().toISOString()
      };
      
      // Get all available sensor values using the thing ID
      console.log(`Fetching sensor values using Thing ID: ${thingId}`);
      const sensorValues = await this.getSensorValues(thingId);
      console.log('Retrieved sensor values:', sensorValues);
      
      // Use the property mapper to standardize field names
      const mappedValues = mapArduinoToDatabaseProperties(sensorValues);
      console.log('Mapped values:', mappedValues);
      
      // Filter out properties that don't exist in our database
      // This is important to prevent errors when trying to insert data
      const validColumns = ['temperature', 'humidity', 'co2concentration', 'airpressure', 'moldrisklevel', 'illuminance'];
      const filteredValues: Record<string, any> = {};
      
      Object.entries(mappedValues).forEach(([key, value]) => {
        if (validColumns.includes(key)) {
          filteredValues[key] = value;
        } else {
          console.log(`Skipping property ${key} as it doesn't exist in the database`);
        }
      });
      
      // Merge the filtered values into our data object
      Object.assign(data, filteredValues);
      
      console.log('Final prepared data for storage:', data);
      
      // Check if we have any sensor data
      if (!Object.keys(filteredValues).length) {
        console.warn('No sensor data was found for device', deviceId);
        
        // Store the data anyway, but warn the user
        const result = await storeSensorData(data);
        return {
          warning: 'No sensor values were found. The device may not be reporting any data.',
          data: result
        };
      }
      
      // Store the data in our database
      return await storeSensorData(data);
    } catch (error) {
      console.error('Error fetching data from Arduino Cloud:', error);
      throw error;
    }
  }
  
  /**
   * Get the current value of a specific property
   */
  async getPropertyValue(thingId: string, propertyId: string): Promise<any> {
    return this.request(`/v1/things/${thingId}/properties/${propertyId}`);
  }

  /**
   * Get available sensor values directly from the device
   * This can be used even if properties don't have values
   */
  async getSensorValues(thingId: string): Promise<Record<string, any>> {
    const sensorData: Record<string, any> = {};
    
    try {
      // First get the device's properties
      const properties = await this.getDeviceProperties(thingId);
      console.log(`Got ${properties.length} properties for thing ${thingId}`, properties);
      
      // Loop through each property and try to get its current value
      for (const prop of properties) {
        try {
          const propId = prop.id;
          const propName = prop.variable_name?.toLowerCase() || prop.name.toLowerCase();
          
          // Skip properties without valid names
          if (!propName) continue;
          
          // Try to get the real-time value
          const propertyData = await this.getPropertyValue(thingId, propId);
          console.log(`Property ${propName} data:`, propertyData);
          
          if (propertyData && propertyData.last_value !== undefined) {
            sensorData[propName] = propertyData.last_value;
          } else if (prop.last_value !== undefined) {
            sensorData[propName] = prop.last_value;
          } else if (prop.value !== undefined) {
            sensorData[propName] = prop.value;
          }
        } catch (error) {
          console.warn(`Could not get value for property ${prop.name}:`, error);
        }
      }
      
      return sensorData;
    } catch (error) {
      console.error('Error fetching sensor values:', error);
      return {};
    }
  }
}

/**
 * Create an Arduino Cloud client using environment variables for configuration
 */
export function createArduinoCloudClient(): ArduinoCloudClient | null {
  const clientId = process.env.ARDUINO_CLOUD_CLIENT_ID;
  const clientSecret = process.env.ARDUINO_CLOUD_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Arduino Cloud credentials not configured');
    return null;
  }
  
  return new ArduinoCloudClient(clientId as string, clientSecret as string);
} 