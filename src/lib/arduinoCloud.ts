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
  // API base URL without version number
  private apiBase: string = 'https://api.arduino.cc/iot';
  private tokenUrl: string = 'https://api.arduino.cc/iot/v1/clients/token';
  private clientId: string;
  private clientSecret: string;
  private accessToken: string = "";
  private refreshToken: string = "";
  private tokenExpiry: number = 0;
  private thingId: string;

  constructor(clientId: string, clientSecret: string, thingId: string = "") {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.thingId = thingId;
    
    if (!this.clientId || !this.clientSecret) {
      console.error('ArduinoCloudClient initialization error: clientId and clientSecret are required');
    }
    
    console.log('ArduinoCloudClient initialized');
    if (thingId) {
      console.log(`Using Thing ID: ${this.thingId}`);
    } else {
      console.warn('No Thing ID provided. You will need to specify thingId for device operations.');
    }
  }

  /**
   * Set or update the Thing ID to use for device operations
   */
  setThingId(thingId: string) {
    this.thingId = thingId;
    console.log(`Thing ID updated to: ${this.thingId}`);
  }

  /**
   * Update a device property value
   */
  async updateDeviceProperty(propertyName: string, value: any, customThingId?: string): Promise<any> {
    const thingId = customThingId || this.thingId;
    
    if (!thingId) {
      throw new Error('No Thing ID provided. Please set a Thing ID using setThingId or pass a customThingId parameter.');
    }
    
    const endpoint = `/v1/things/${thingId}/properties/${propertyName}/publish`;
    
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }

  /**
   * Check if the current access token is expired and refresh if needed
   */
  async refreshAccessTokenIfNeeded(): Promise<string> {
    const currentTime = Date.now();
    // Add a 60-second buffer to ensure we don't use a token that's about to expire
    if (!this.accessToken || currentTime >= this.tokenExpiry - 60000) {
      console.log("Token expired or not present, refreshing...");
      return this.refreshAccessToken();
    }
    return this.accessToken;
  }

  /**
   * Force refreshing the access token
   */
  async refreshAccessToken(force: boolean = false): Promise<string> {
    if (this.accessToken && !force && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    console.log("Requesting new access token...");
    
    try {
      // Parameters for the token request
      const params = {
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: "https://api2.arduino.cc/iot"
      };
      
      // Log the token request details (except credentials)
      console.log(`Token request URL: https://api.arduino.cc/iot/v1/clients/token`);
      console.log(`Token request parameters: grant_type=${params.grant_type}, client_id=${params.client_id.substring(0, 8)}..., audience=${params.audience}`);
      
      // Exactly match the Postman request format with audience parameter
      const tokenResponse = await fetch("https://api.arduino.cc/iot/v1/clients/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Failed to fetch token:", errorText);
        throw new Error(`Token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log("Token response:", JSON.stringify(tokenData));
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || "";
      // Convert expires_in (seconds) to an absolute timestamp (milliseconds)
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      
      console.log("Successfully obtained new access token");
      return this.accessToken;
    } catch (error) {
      console.error("Token request failed with error:", error);
      throw error;
    }
  }

  /**
   * Make a request to the Arduino Cloud API
   */
  async request(endpoint: string, options: any = {}): Promise<any> {
    // Ensure we have a valid token before making the request
    const token = await this.refreshAccessTokenIfNeeded();
    
    // Create full URL - handle both absolute and relative URLs
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiBase}${endpoint}`;
    
    // Set up default headers with auth token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers || {}
    };
    
    // Combine options with our defaults
    const requestOptions = {
      ...options,
      headers
    };
    
    try {
      console.log(`Making API request to: ${url}`);
      console.log(`Request method: ${options.method || 'GET'}`);
      console.log(`Request headers:`, JSON.stringify(headers));
      
      const response = await fetch(url, requestOptions);
      console.log(`Response status: ${response.status}`);
      
      // If unauthorized, try to refresh token and retry once
      if (response.status === 401) {
        console.log('Received 401 unauthorized, refreshing token and retrying...');
        await this.refreshAccessToken(true); // Force token refresh
        
        // Update headers with new token
        requestOptions.headers = {
          ...requestOptions.headers,
          'Authorization': `Bearer ${this.accessToken}`
        };
        
        console.log(`Retrying request with new token to: ${url}`);
        
        // Retry the request
        const retryResponse = await fetch(url, requestOptions);
        console.log(`Retry response status: ${retryResponse.status}`);
        
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          console.error(`API request failed after token refresh: ${retryResponse.status} ${retryResponse.statusText}`);
          console.error('Error details:', errorText);
          throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        
        // Try to parse as JSON, but fall back to text if it's not JSON
        try {
          const responseData = await retryResponse.json();
          console.log(`Received response data type: ${typeof responseData}`);
          return responseData;
        } catch (e) {
          const textResponse = await retryResponse.text();
          console.log(`Received text response: ${textResponse.substring(0, 100)}...`);
          return textResponse;
        }
      }
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
        
        // Try to parse error JSON if possible
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.detail || errorJson.message || `API request failed: ${response.status}`);
        } catch (e) {
          // If we can't parse as JSON, just use the raw text
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }
      
      // Try to parse success response as JSON, fall back to text
      try {
        const responseData = await response.json();
        console.log(`Received response data type: ${typeof responseData}`);
        return responseData;
      } catch (e) {
        // If not JSON, return as text
        const textResponse = await response.text();
        console.log(`Received text response: ${textResponse.substring(0, 100)}...`);
        return textResponse;
      }
    } catch (error) {
      console.error(`Error in request to ${url}:`, error);
      throw error;
    }
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
      const response = await this.request(`/v2/things/${thingId}/properties`);
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
      
      // Try fallback to v1 API endpoint if v2 fails
      try {
        console.log(`Attempting fallback to v1 API for Thing ID: ${thingId}`);
        const response = await this.request(`/v1/things/${thingId}/properties`);
        
        if (Array.isArray(response)) {
          return response.map(prop => ({
            id: prop.id,
            name: prop.name || prop.variable_name || 'Unknown',
            variable_name: prop.variable_name,
            last_value: prop.last_value,
            type: prop.type || 'unknown',
            updated_at: prop.value_updated_at || new Date().toISOString()
          }));
        }
      } catch (fallbackError) {
        console.error(`Fallback to v1 API also failed:`, fallbackError);
      }
      
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
      console.log(`Starting data fetch process for device: ${deviceId}, thing: ${thingId}`);
      
      // Find the painting ID for this device from the database
      const paintingId = await this.getDevicePainting(deviceId);
      
      if (!paintingId) {
        throw new Error(`No painting associated with device: ${deviceId}`);
      }
      
      console.log(`Found painting ID: ${paintingId} for device: ${deviceId}`);
      
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
      
      // Debug log each individual value
      console.log('Individual sensor values:');
      Object.entries(sensorValues).forEach(([key, value]) => {
        console.log(`- ${key}: ${value} (${typeof value})`);
      });
      
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
          console.log(`Adding property ${key}: ${value} to database record`);
        } else {
          console.log(`Skipping property ${key} as it doesn't exist in the database`);
        }
      });
      
      // Verify we have at least some data
      if (Object.keys(filteredValues).length === 0) {
        console.warn(`WARNING: No valid properties found for device ${deviceId}. Check Arduino Cloud connection.`);
      }
      
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
      const result = await storeSensorData(data);
      console.log(`Data successfully stored for device: ${deviceId}`);
      return result;
    } catch (error) {
      console.error('Error fetching data from Arduino Cloud:', error);
      throw error;
    }
  }
  
  /**
   * Get the current value of a specific property
   */
  async getPropertyValue(thingId: string, propertyId: string): Promise<any> {
    try {
      console.log(`Fetching property value for Thing ID: ${thingId}, Property ID: ${propertyId}`);
      const response = await this.request(`/v1/things/${thingId}/properties/${propertyId}`);
      
      // Log the response structure for debugging
      console.log(`Property API response structure:`, 
        Object.keys(response).length > 0 
          ? `Fields: ${Object.keys(response).join(', ')}` 
          : 'Empty response'
      );
      
      if (response.last_value !== undefined) {
        console.log(`Found last_value: ${response.last_value}`);
      } else {
        console.log('No last_value found in property response');
      }
      
      return response;
    } catch (error) {
      console.error(`Error fetching property value for ${propertyId}:`, error);
      // Return an empty object rather than throwing, to make error handling easier
      return {};
    }
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
      
      // Arduino property names directly from UI - maintain exact case as shown in Arduino Cloud
      const exactPropertyNames = ['airPressure', 'co2Concentration', 'humidity', 'temperature', 'illuminance', 'moldRiskLevel'];
      
      // Create a direct mapping for proper case sensitivity
      const propsByVariableName = new Map();
      for (const prop of properties) {
        if (prop.variable_name) {
          propsByVariableName.set(prop.variable_name, prop);
        }
      }
      
      console.log('Direct property mapping:', [...propsByVariableName.keys()]);
      
      // First attempt: Try to get values using the exact property names
      for (const exactName of exactPropertyNames) {
        if (propsByVariableName.has(exactName)) {
          const prop = propsByVariableName.get(exactName);
          const propId = prop.id;
          
          try {
            // Get detailed property data with the exact property name
            const propertyData = await this.getPropertyValue(thingId, propId);
            
            // Process the value if found
            if (propertyData && propertyData.last_value !== undefined) {
              console.log(`Found direct match for ${exactName}: ${propertyData.last_value}`);
              sensorData[exactName] = propertyData.last_value;
            } else if (prop.last_value !== undefined) {
              console.log(`Using property last_value for ${exactName}: ${prop.last_value}`);
              sensorData[exactName] = prop.last_value;
            }
          } catch (error) {
            console.warn(`Error getting value for direct property ${exactName}:`, error);
          }
        }
      }
      
      // Log what we've found so far
      console.log('Values after direct property matching:', sensorData);
      
      // Secondary approach: fallback to the more generic approach
      // Loop through each property and try to get its current value
      for (const prop of properties) {
        try {
          const propId = prop.id;
          const propName = prop.variable_name?.toLowerCase() || prop.name.toLowerCase();
          
          // Skip properties without valid names or already processed
          if (!propName || sensorData[prop.variable_name || ''] !== undefined) continue;
          
          // Get detailed property data to ensure we have the latest value
          const propertyData = await this.getPropertyValue(thingId, propId);
          console.log(`Property ${propName} data:`, propertyData);
          
          // Try multiple paths to get the value, based on different API response formats
          let propertyValue = undefined;
          
          // First try to get from property data returned from API call
          if (propertyData) {
            // Direct last_value is the most reliable if available
            if (propertyData.last_value !== undefined) {
              propertyValue = propertyData.last_value;
            // Try value field next
            } else if (propertyData.value !== undefined) {
              propertyValue = propertyData.value;
            // Try current_value if it exists
            } else if (propertyData.current_value !== undefined) {
              propertyValue = propertyData.current_value;
            }
          }
          
          // If we couldn't get a value from property data, fall back to original property
          if (propertyValue === undefined) {
            if (prop.last_value !== undefined) {
              propertyValue = prop.last_value;
            } else if (prop.value !== undefined) {
              propertyValue = prop.value;
            }
          }
          
          // Only assign if we actually found a value
          if (propertyValue !== undefined) {
            sensorData[propName] = propertyValue;
            console.log(`Got value for ${propName}: ${propertyValue}`);
          } else {
            console.log(`No value found for ${propName}`);
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

  /**
   * Get the most recent sensor values directly from Arduino Cloud for a specific thing
   * This bypasses all caching and property mapping to get exactly what's shown in the Arduino Cloud UI
   */
  async getLatestValues(thingId: string): Promise<Record<string, any>> {
    console.log(`Directly fetching latest values from Arduino Cloud for Thing ID: ${thingId}`);
    
    try {
      // First, get the thing's full details to see all properties
      const thing = await this.request(`/v1/things/${thingId}`);
      console.log(`Got thing details:`, thing);
      
      if (!thing || !thing.properties) {
        console.warn('No properties found in thing details');
        return {};
      }
      
      const propertyValues: Record<string, any> = {};
      
      // Get values for each property directly from the property endpoint
      for (const prop of thing.properties) {
        if (!prop.id || !prop.name) continue;
        
        try {
          // Make a separate request for each property to get the freshest data
          const propertyData = await this.request(`/v1/things/${thingId}/properties/${prop.id}`);
          
          if (propertyData) {
            console.log(`Raw property data for ${prop.name}:`, propertyData);
            
            // Find the latest value - try all possible field names
            const value = propertyData.last_value ?? propertyData.value ?? propertyData.current_value;
            
            if (value !== undefined && value !== null) {
              // Store using the exact property name from Arduino Cloud
              propertyValues[prop.name] = value;
              console.log(`Got fresh value for ${prop.name}: ${value}`);
            }
          }
        } catch (error) {
          console.error(`Error fetching property ${prop.name}:`, error);
        }
      }
      
      if (Object.keys(propertyValues).length === 0) {
        console.warn('No property values found after querying all properties');
      } else {
        console.log('Final collection of values:', propertyValues);
      }
      
      return propertyValues;
    } catch (error) {
      console.error('Error fetching latest values:', error);
      throw error;
    }
  }

  /**
   * Get all properties for a device
   */
  async getAllDeviceProperties(customThingId?: string): Promise<any> {
    const thingId = customThingId || this.thingId;
    
    if (!thingId) {
      throw new Error('No Thing ID provided. Please set a Thing ID using setThingId or pass a customThingId parameter.');
    }
    
    const endpoint = `/v1/things/${thingId}/properties`;
    console.log(`Getting all properties using endpoint: ${endpoint}`);
    
    return this.request(endpoint);
  }

  /**
   * Get device information
   */
  async getDeviceInfo(customThingId?: string): Promise<any> {
    const thingId = customThingId || this.thingId;
    
    if (!thingId) {
      throw new Error('No Thing ID provided. Please set a Thing ID using setThingId or pass a customThingId parameter.');
    }
    
    const endpoint = `/v1/things/${thingId}`;
    
    return this.request(endpoint);
  }

  /**
   * List all Things accessible to the user
   */
  async listThings(): Promise<any> {
    console.log('Listing all things using endpoint: /v1/things');
    return this.request('/v1/things');
  }

  /**
   * Get a device property value
   */
  async getDeviceProperty(propertyName: string, customThingId?: string): Promise<any> {
    const thingId = customThingId || this.thingId;
    
    if (!thingId) {
      throw new Error('No Thing ID provided. Please set a Thing ID using setThingId or pass a customThingId parameter.');
    }
    
    const endpoint = `/v1/things/${thingId}/properties/${propertyName}`;
    
    const response = await this.request(endpoint);
    return response.last_value;
  }

  /**
   * Create a webhook to receive real-time property updates
   */
  async createWebhook(callbackUrl: string, customThingId?: string): Promise<any> {
    const thingId = customThingId || this.thingId;
    
    if (!thingId) {
      throw new Error('No Thing ID provided. Please set a Thing ID using setThingId or pass a customThingId parameter.');
    }
    
    const endpoint = `/things/${thingId}/callback`;
    
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ callback_url: callbackUrl })
    });
  }
}

/**
 * Create an Arduino Cloud client using environment variables for configuration
 */
export function createArduinoCloudClient(): ArduinoCloudClient | null {
  const clientId = process.env.ARDUINO_CLOUD_CLIENT_ID;
  const clientSecret = process.env.ARDUINO_CLOUD_CLIENT_SECRET;
  
  if (!clientId) {
    console.error('❌ ARDUINO_CLOUD_CLIENT_ID not configured in environment variables');
    return null;
  }
  
  if (!clientSecret) {
    console.error('❌ ARDUINO_CLOUD_CLIENT_SECRET not configured in environment variables');
    return null;
  }
  
  try {
    console.log('Creating Arduino Cloud client with credentials');
    return new ArduinoCloudClient(clientId, clientSecret, '');
  } catch (error) {
    console.error('Failed to create Arduino Cloud client:', error);
    return null;
  }
} 