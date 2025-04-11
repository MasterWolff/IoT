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
    arduinoNames: ['temperature'],
    dbName: 'temperature',
    displayName: 'Temperature',
    unit: '°C'
  },
  humidity: {
    arduinoNames: ['humidity', 'relativehumidity'],
    dbName: 'humidity',
    displayName: 'Humidity',
    unit: '%'
  },
  co2: {
    arduinoNames: ['co2', 'co2concentration', 'carbon_dioxide'],
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
  }
};

/**
 * Maps Arduino property values to our database schema
 * @param sensorValues Object or array containing values from Arduino Cloud with arbitrary property names
 * @returns Object with standardized property names matching our database schema
 */
export function mapArduinoToDatabaseProperties(sensorValues: any): Record<string, any> {
  const mappedData: Record<string, any> = {};
  
  // Handle case when input is an object (Arduino Cloud API format)
  if (sensorValues && typeof sensorValues === 'object' && !Array.isArray(sensorValues)) {
    // Convert all keys to lowercase for case-insensitive matching
    Object.entries(sensorValues).forEach(([key, value]) => {
      const propertyName = key.toLowerCase();
      
      // Map property to database column name
      for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
        if (mapping.arduinoNames.includes(propertyName)) {
          mappedData[mapping.dbName] = value;
          break;
        }
      }
    });
    
    return mappedData;
  }
  
  // Handle case when input is an array (store-arduino API format)
  if (Array.isArray(sensorValues)) {
    sensorValues.forEach((sensorItem) => {
      // Handle name/value pair format (e.g., [{name: "co2Concentration", value: 800}])
      if (sensorItem && typeof sensorItem === 'object') {
        if ('name' in sensorItem && 'value' in sensorItem) {
          const propertyName = String(sensorItem.name).toLowerCase();
          const propertyValue = sensorItem.value;
          
          // Map each property to its database column name
          for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
            if (mapping.arduinoNames.includes(propertyName)) {
              mappedData[mapping.dbName] = propertyValue;
              break;
            }
          }
        }
        // Handle variable_name/value pair format (e.g., [{variable_name: "co2Concentration", value: 800}])
        else if ('variable_name' in sensorItem && 'value' in sensorItem) {
          const propertyName = String(sensorItem.variable_name).toLowerCase();
          const propertyValue = sensorItem.value;
          
          // Map each property to its database column name
          for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
            if (mapping.arduinoNames.includes(propertyName)) {
              mappedData[mapping.dbName] = propertyValue;
              break;
            }
          }
        }
        // Handle direct property format within array items
        else {
          // Convert all keys to lowercase for case-insensitive matching
          Object.entries(sensorItem).forEach(([key, value]) => {
            const propertyName = key.toLowerCase();
            
            // Map each property to its database column name
            for (const mapping of Object.values(PROPERTY_MAPPINGS)) {
              if (mapping.arduinoNames.includes(propertyName)) {
                mappedData[mapping.dbName] = value;
                break;
              }
            }
          });
        }
      }
    });
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