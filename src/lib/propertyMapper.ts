/**
 * Property mapper utility
 * 
 * This file provides standardized mapping between Arduino Cloud property names and our database schema
 * to ensure consistency across the application and avoid naming mismatches.
 */

export interface PropertyMapping {
  arduinoNames: string[];  // Possible Arduino Cloud property names (lowercase)
  dbName: string;         // Database schema property name
  displayName: string;    // Human-readable name for display
  unit: string;           // Measurement unit
}

// Mapping between Arduino and Database property names
export const PROPERTY_MAPPINGS: Record<string, PropertyMapping> = {
  temperature: {
    arduinoNames: ['temperature', 'Temperature'],
    dbName: 'temperature',
    displayName: 'Temperature',
    unit: '°C'
  },
  humidity: {
    arduinoNames: ['humidity', 'relativehumidity', 'Humidity'],
    dbName: 'humidity',
    displayName: 'Humidity',
    unit: '%'
  },
  co2: {
    arduinoNames: ['co2', 'co2concentration', 'carbon_dioxide', 'CO2', 'co2Concentration'],
    dbName: 'co2concentration',  // Updated to match the actual database column name
    displayName: 'CO₂',
    unit: 'ppm'
  },
  airPressure: {
    arduinoNames: ['pressure', 'airpressure', 'air_pressure', 'atmospheric_pressure', 'airPressure'],
    dbName: 'airpressure',  // Database column name
    displayName: 'Air Pressure',
    unit: 'hPa'
  },
  moldRisk: {
    arduinoNames: ['moldrisk', 'moldrisklevel', 'mold_risk_level', 'mold_risk', 'moldRiskLevel'],
    dbName: 'moldrisklevel', // Updated to match the actual database column name
    displayName: 'Mold Risk',
    unit: ''
  },
  illumination: {
    arduinoNames: ['illumination', 'illuminance', 'light', 'lightlevel', 'light_level', 'illuminationlevel', 'Illuminance'],
    dbName: 'illuminance', // Based on the field name in the database schema
    displayName: 'Illumination',
    unit: 'lux'
  }
};

/**
 * Maps Arduino property values to our database schema
 * @param sensorValues Object or array containing values from Arduino Cloud with arbitrary property names
 * @returns Object with standardized property names matching our database schema
 */
export function mapArduinoToDatabaseProperties(sensorValues: any): Record<string, any> {
  const mappedData: Record<string, any> = {};
  
  // Direct mapping for exact Arduino Cloud property names (from the UI)
  const directMappings: Record<string, string> = {
    'airPressure': 'airpressure',
    'co2Concentration': 'co2concentration',
    'humidity': 'humidity',
    'temperature': 'temperature',
    'illuminance': 'illuminance',
    'moldRiskLevel': 'moldrisklevel'
  };
  
  // Handle case when input is an object (Arduino Cloud API format)
  if (sensorValues && typeof sensorValues === 'object' && !Array.isArray(sensorValues)) {
    // First try direct mapping with exact property names
    for (const [arduinoName, dbColumn] of Object.entries(directMappings)) {
      if (arduinoName in sensorValues) {
        mappedData[dbColumn] = sensorValues[arduinoName];
        console.log(`Direct mapped ${arduinoName} → ${dbColumn}: ${sensorValues[arduinoName]}`);
      }
    }
    
    // If direct mapping didn't yield all values, try case-insensitive mapping
    if (Object.keys(mappedData).length < Object.keys(directMappings).length) {
      console.log('Some properties not found with direct mapping, trying fallback approach');
      
      // Convert all keys to lowercase for case-insensitive matching
      Object.entries(sensorValues).forEach(([key, value]) => {
        // Skip keys we've already mapped
        const dbColumn = directMappings[key];
        if (dbColumn && mappedData[dbColumn] !== undefined) {
          return;
        }
        
        const propertyName = key.toLowerCase();
        
        // Map property to database column name
        for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
          if (mapping.arduinoNames.includes(propertyName)) {
            mappedData[mapping.dbName] = value;
            console.log(`Fallback mapped ${key} → ${mapping.dbName}: ${value}`);
            break;
          }
        }
      });
    }
    
    return mappedData;
  }
  
  // Handle case when input is an array (store-arduino API format)
  if (Array.isArray(sensorValues)) {
    // First look for exact property name matches in the array
    for (const item of sensorValues) {
      if (item && typeof item === 'object' && 'variable_name' in item && 'value' in item) {
        // Check direct mapping first
        const variableName = item.variable_name;
        const value = item.value;
        
        if (variableName && directMappings[variableName]) {
          mappedData[directMappings[variableName]] = value;
          console.log(`Array direct mapped ${variableName} → ${directMappings[variableName]}: ${value}`);
        }
      }
    }
    
    // If not all properties found, continue with original array handling
    if (Object.keys(mappedData).length < Object.keys(directMappings).length) {
      sensorValues.forEach((sensorItem) => {
        // Handle name/value pair format (e.g., [{name: "co2Concentration", value: 800}])
        if (sensorItem && typeof sensorItem === 'object') {
          if ('name' in sensorItem && 'value' in sensorItem) {
            const propertyName = String(sensorItem.name).toLowerCase();
            const propertyValue = sensorItem.value;
            
            // Skip if already mapped
            for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
              if (mapping.arduinoNames.includes(propertyName) && !mappedData[mapping.dbName]) {
                mappedData[mapping.dbName] = propertyValue;
                console.log(`Array fallback mapped name ${propertyName} → ${mapping.dbName}: ${propertyValue}`);
                break;
              }
            }
          }
          // Handle variable_name/value pair format (e.g., [{variable_name: "co2Concentration", value: 800}])
          else if ('variable_name' in sensorItem && 'value' in sensorItem) {
            const propertyName = String(sensorItem.variable_name).toLowerCase();
            const propertyValue = sensorItem.value;
            
            // Skip if already mapped
            for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
              if (mapping.arduinoNames.includes(propertyName) && !mappedData[mapping.dbName]) {
                mappedData[mapping.dbName] = propertyValue;
                console.log(`Array fallback mapped variable_name ${propertyName} → ${mapping.dbName}: ${propertyValue}`);
                break;
              }
            }
          }
          // Handle direct property format within array items
          else {
            // Skip whole object if we already mapped all properties
            if (Object.keys(mappedData).length >= Object.keys(directMappings).length) {
              return;
            }
            
            // Convert all keys to lowercase for case-insensitive matching
            Object.entries(sensorItem).forEach(([key, value]) => {
              const propertyName = key.toLowerCase();
              
              // Skip if already mapped
              for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
                if (mapping.arduinoNames.includes(propertyName) && !mappedData[mapping.dbName]) {
                  mappedData[mapping.dbName] = value;
                  console.log(`Array fallback mapped object key ${propertyName} → ${mapping.dbName}: ${value}`);
                  break;
                }
              }
            });
          }
        }
      });
    }
  }
  
  return mappedData;
}

/**
 * Get the standardized database column name for a given property key
 * @param propertyKey The property key from Arduino Cloud or any other source
 * @returns The standardized database column name or the original key if not found
 */
export function getDatabaseColumnName(propertyKey: string): string {
  const normalizedKey = propertyKey.toLowerCase();
  
  for (const [key, mapping] of Object.entries(PROPERTY_MAPPINGS)) {
    if (mapping.arduinoNames.includes(normalizedKey)) {
      return mapping.dbName;
    }
  }
  
  return propertyKey; // Return original if no mapping found
}

/**
 * Get the display name for a property
 * @param dbColumnName The database column name
 * @returns The human-readable display name and unit
 */
export function getDisplayInfo(dbColumnName: string): { name: string; unit: string } {
  for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
    if (mapping.dbName === dbColumnName) {
      return { 
        name: mapping.displayName, 
        unit: mapping.unit 
      };
    }
  }
  
  // Return a capitalized version of the column name if no mapping found
  return { 
    name: dbColumnName.charAt(0).toUpperCase() + dbColumnName.slice(1), 
    unit: '' 
  };
} 