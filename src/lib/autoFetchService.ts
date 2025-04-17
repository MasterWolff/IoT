import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Data update event system
type DataUpdateListener = () => void;
const dataUpdateListeners: DataUpdateListener[] = [];

export const subscribeToDataUpdates = (listener: DataUpdateListener) => {
  dataUpdateListeners.push(listener);
  return () => {
    const index = dataUpdateListeners.indexOf(listener);
    if (index !== -1) {
      dataUpdateListeners.splice(index, 1);
    }
  };
};

const notifyDataUpdate = () => {
  dataUpdateListeners.forEach(listener => listener());
};

// Type definition for our data item
export type DataItem = {
  id: string | number;
  timestamp: string;
  data: any;
  paintingName: string;
};

// Type definition for auto-fetch state
interface AutoFetchState {
  // Configuration
  isRunning: boolean;
  isPaused: boolean;
  duration: number; // in minutes
  interval: number; // in seconds
  timeRemaining: number; // in seconds
  
  // Statistics
  fetchCount: number;
  successCount: number;
  errorCount: number;
  lastFetchTime: string | null;
  nextFetchTime: string | null;
  statusMessage: string;
  recentData: DataItem[];
  
  // Actions
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  fetchData: () => Promise<void>;
  setDuration: (duration: number) => void;
  setInterval: (interval: number) => void;
  decrementTimeRemaining: () => void;
  setLastFetchTime: (time: Date) => void;
  setNextFetchTime: (time: Date) => void;
}

// Create the store with persistence
export const useAutoFetchStore = create<AutoFetchState>()(
  persist(
    (set, get) => ({
      // Initial state
      isRunning: false,
      isPaused: false,
      duration: 5,
      interval: 5,
      timeRemaining: 0,
      fetchCount: 0,
      successCount: 0,
      errorCount: 0,
      lastFetchTime: null,
      nextFetchTime: null,
      statusMessage: 'Ready to start',
      recentData: [],
      
      // Actions
      start: () => {
        const { duration, fetchData } = get();
        set({
          isRunning: true,
          isPaused: false,
          timeRemaining: duration * 60,
          fetchCount: 0,
          successCount: 0,
          errorCount: 0,
          lastFetchTime: null,
          recentData: [],
          statusMessage: 'Starting data collection...'
        });
        
        // Fetch data immediately
        fetchData();
      },
      
      stop: () => {
        set({
          isRunning: false,
          isPaused: false,
          timeRemaining: 0,
          nextFetchTime: null,
          statusMessage: 'Data collection stopped'
        });
      },
      
      pause: () => {
        const isPaused = get().isPaused;
        set({ 
          isPaused: !isPaused,
          statusMessage: !isPaused ? 'Data collection paused' : 'Data collection resumed',
          nextFetchTime: isPaused ? new Date(Date.now() + get().interval * 1000).toISOString() : null
        });
      },
      
      resume: () => {
        set({ 
          isPaused: false,
          statusMessage: 'Data collection resumed',
          nextFetchTime: new Date(Date.now() + get().interval * 1000).toISOString()
        });
      },
      
      fetchData: async () => {
        const {
          isRunning,
          isPaused,
          interval
        } = get();
        
        // If not running or paused, don't fetch
        if (!isRunning || isPaused) return;
        
        try {
          set({ 
            statusMessage: 'Fetching data from Arduino Cloud...',
            lastFetchTime: new Date().toISOString(),
            fetchCount: get().fetchCount + 1
          });
          
          // Use our proxy endpoint instead of direct API calls
          console.log('Calling Arduino proxy API to fetch live data...');
          const response = await fetch('/api/arduino-proxy?action=listThings');
          
          if (!response.ok) {
            let errorMessage = 'Failed to fetch Arduino data';
            
            try {
              const errorData = await response.json();
              console.error('API error response:', errorData);
              
              // Handle authentication errors specifically
              if (response.status === 401 || errorData.authError) {
                errorMessage = errorData.details || errorData.error || 
                  'Arduino Cloud authentication failed. Please check your API credentials.';
                
                console.error('Authentication error:', errorData);
                
                set({ 
                  errorCount: get().errorCount + 1,
                  statusMessage: `Authentication Error: ${errorMessage}`
                });
                
                throw new Error(`Authentication error: ${errorMessage}`);
              }
              
              // Handle invalid action error
              if (response.status === 400 && (errorData.error || '').includes('Invalid action')) {
                errorMessage = 'Invalid action specified. The API endpoint requires specific action parameters.';
                
                console.error('Invalid action error:', errorData);
                
                set({ 
                  errorCount: get().errorCount + 1,
                  statusMessage: `API Error: ${errorMessage}`
                });
                
                throw new Error(`API error: ${response.status} ${errorMessage}`);
              }
              
              // Generic error handling
              errorMessage = errorData.error || errorData.detail || response.statusText;
            } catch (parseError) {
              // If we can't parse the response as JSON
              console.error('Error parsing API error response:', parseError);
            }
            
            throw new Error(`API error: ${response.status} ${errorMessage}`);
          }
          
          const data = await response.json();
          
          // Debug log to see the exact structure
          console.log('Arduino proxy API response:', data);
          
          if (data.success) {
            // Get the list of things
            const things = data.result || [];
            
            // If we have things, get properties for the first one
            if (things.length > 0) {
              const thingId = things[0].id;
              console.log(`Using Thing ID: ${thingId} to fetch properties`);
              
              try {
                // Fetch properties for this thing
                const propertiesResponse = await fetch(`/api/arduino-proxy?action=getAllProperties&thingId=${thingId}`);
                
                if (!propertiesResponse.ok) {
                  throw new Error(`Failed to fetch properties: ${propertiesResponse.status}`);
                }
                
                const propertiesData = await propertiesResponse.json();
                console.log('Properties data:', propertiesData);
                
                if (propertiesData.success && propertiesData.result) {
                  // Extract properties
                  const properties = Array.isArray(propertiesData.result) 
                    ? propertiesData.result 
                    : Object.entries(propertiesData.result).map(([key, value]) => ({
                        id: key,
                        name: key,
                        variable_name: key,
                        last_value: value
                      }));
                  
                  // Create a data item with the thing and its properties
                  const fetchTimestamp = new Date().toISOString();
                  
                  // Try to get the painting name from localStorage if available
                  const storedPaintingName = localStorage.getItem(`painting_name_${thingId}`);
                  
                  // Debug log for painting ID mapping issue
                  console.log('DIAGNOSTIC: Creating data item with painting name:', {
                    thingName: things[0].name,
                    storedPaintingName,
                    thingId: thingId
                  });
                  
                  const dataItem: DataItem = {
                    id: crypto.randomUUID(),
                    timestamp: fetchTimestamp,
                    data: {
                      properties: properties,
                      thingId: thingId,
                      thingName: things[0].name,
                      fetchTimestamp: fetchTimestamp
                    },
                    paintingName: storedPaintingName || "Mona Lisa"
                  };
                  
                  // Update recent data
                  const currentData = get().recentData;
                  set({
                    recentData: [dataItem, ...currentData].slice(0, 10),
                    successCount: get().successCount + 1,
                    statusMessage: `Successfully fetched data for Thing: ${things[0].name || thingId}`
                  });
                  
                  // Send data to the database via store-arduino endpoint
                  try {
                    console.log('Storing fetched data in database...');
                    
                    // Fetch devices directly from the API
                    const deviceResponse = await fetch('/api/devices');
                    const deviceData = await deviceResponse.json();
                    
                    console.log('DEVICE LOOKUP DEBUG:', {
                      allDevicesCount: deviceData.devices?.length || 0,
                      arduinoThingId: thingId
                    });
                    
                    if (deviceData.success && deviceData.devices && deviceData.devices.length > 0) {
                      // Find the device that matches our Arduino thing ID - use exact match
                      const matchingDevice = deviceData.devices.find(
                        (device: any) => device.arduino_thing_id === thingId
                      );
                      
                      if (matchingDevice) {
                        // We found a device matching this Arduino thing ID
                        const deviceId = matchingDevice.id;
                        const paintingId = matchingDevice.painting_id;
                        const paintingName = matchingDevice.paintings?.name || 'Unknown';
                        
                        console.log(`✅ MATCH FOUND: Device ID: ${deviceId} for Arduino Thing ID: ${thingId}`);
                        console.log(`✅ Using painting ID: ${paintingId} (${paintingName})`);
                        
                        // Store device and painting info for future use
                        try {
                          localStorage.setItem(`device_id_for_arduino_${thingId}`, deviceId);
                          localStorage.setItem(`painting_for_device_${thingId}`, paintingId);
                          localStorage.setItem(`painting_name_${thingId}`, paintingName);
                          
                          console.log('✅ Stored device and painting info in localStorage:', {
                            [`device_id_for_arduino_${thingId}`]: deviceId,
                            [`painting_for_device_${thingId}`]: paintingId,
                            [`painting_name_${thingId}`]: paintingName
                          });
                          
                          // Also update the dataItem to contain the correct painting name
                          const updatedData = get().recentData;
                          if (updatedData.length > 0) {
                            updatedData[0].paintingName = paintingName;
                            set({ recentData: updatedData });
                          }
                        } catch (storageError) {
                          console.warn('Failed to store device info in localStorage:', storageError);
                        }
                        
                        // Store environmental data using proper IDs
                        console.log('💾 Storing data with correct device and painting IDs:', {
                          arduino_thing_id: thingId,
                          device_id: deviceId,
                          painting_id: paintingId
                        });
                        
                        // Make the API call to store data
                        const storeResponse = await fetch('/api/store-arduino', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            device_id: deviceId,  // Use the actual device ID, not the Arduino thing ID
                            painting_id: paintingId,
                            data: properties.map((prop: { variable_name: string; last_value: any }) => ({
                              variable_name: prop.variable_name,
                              value: prop.last_value
                            }))
                          })
                        });
                        
                        // Check if the request was successful
                        if (!storeResponse.ok) {
                          const errorText = await storeResponse.text();
                          console.error(`❌ SERVER ERROR: ${storeResponse.status}`, {
                            responseText: errorText
                          });
                          throw new Error(`Server error ${storeResponse.status}: ${errorText}`);
                        }
                        
                        const storeResult = await storeResponse.json();
                        
                        if (storeResult.success) {
                          console.log('✅ DATA STORED SUCCESSFULLY:', storeResult);
                          set({
                            statusMessage: `Data stored in database for ${things[0].name || thingId}`
                          });
                          
                          // Add a prominent success log message for data storage
                          console.log('✅ DATABASE STORAGE SUCCESSFUL: Environmental data stored in database', {
                            device: things[0].name || thingId,
                            deviceId,
                            paintingId,
                            timestamp: new Date().toISOString(),
                            dataPoints: properties.length
                          });
                        } else {
                          console.error('❌ DATA STORAGE FAILED:', storeResult.error);
                          set({
                            statusMessage: `Failed to store data: ${storeResult.error || 'Unknown error'}`
                          });
                        }
                      } else {
                        console.warn(`❌ No device found with arduino_thing_id: ${thingId}`);
                        set({
                          statusMessage: `No device found for Arduino Thing ID: ${thingId}`
                        });
                      }
                    } else {
                      console.warn('❌ No devices found in the database');
                      set({
                        statusMessage: 'No devices found in the database'
                      });
                    }
                  } catch (storeError) {
                    console.error('❌ Error storing data:', storeError);
                    set({
                      statusMessage: `Error storing data: ${storeError instanceof Error ? storeError.message : 'Unknown error'}`
                    });
                  }
                  
                  // Notify data subscribers that new data is available
                  notifyDataUpdate();
                  
                  // Add debugging log to check what data we're getting
                  console.log('DIAGNOSTIC: Successfully fetched data from Arduino Cloud', {
                    thingId: thingId,
                    thingName: things[0].name,
                    propertiesCount: properties.length,
                    properties: properties,
                    timestamp: fetchTimestamp,
                    missingStorageCall: 'Data is fetched but not being sent to store-arduino endpoint'
                  });
                  
                  // Schedule next fetch
                  if (isRunning && !isPaused) {
                    const nextTime = new Date(Date.now() + interval * 1000);
                    set({ nextFetchTime: nextTime.toISOString() });
                  }
                  
                  return propertiesData;
                } else {
                  throw new Error(propertiesData.error || 'Failed to fetch properties');
                }
              } catch (propertiesError) {
                console.error('Error fetching properties:', propertiesError);
                throw propertiesError;
              }
            } else {
              set({ 
                successCount: get().successCount + 1,
                statusMessage: `No Arduino things found`
              });
              
              // Create a blank data item
              const dataItem: DataItem = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                data: {
                  properties: [],
                  message: "No Arduino things found"
                },
                paintingName: "No Device"
              };
              
              // Update recent data
              const currentData = get().recentData;
              set({
                recentData: [dataItem, ...currentData].slice(0, 10)
              });
              
              // Notify data subscribers that new data is available
              notifyDataUpdate();
              
              // Schedule next fetch
              if (isRunning && !isPaused) {
                const nextTime = new Date(Date.now() + interval * 1000);
                set({ nextFetchTime: nextTime.toISOString() });
              }
            }
          } else {
            throw new Error(data.error || 'Unknown API error');
          }
        } catch (error) {
          set({ 
            errorCount: get().errorCount + 1,
            statusMessage: `Error: ${error instanceof Error ? error.message : 'Failed to fetch data from Arduino Cloud'}`
          });
          console.error('Error fetching Arduino Cloud data:', error);
          throw error;
        }
      },
      
      setDuration: (duration: number) => set({ duration }),
      
      setInterval: (interval: number) => set({ interval }),
      
      decrementTimeRemaining: () => {
        const { timeRemaining, isRunning, isPaused, stop } = get();
        if (isRunning && !isPaused && timeRemaining > 0) {
          set({ timeRemaining: timeRemaining - 1 });
        } else if (isRunning && timeRemaining <= 0) {
          stop();
        }
      },
      
      setLastFetchTime: (time: Date) => set({ lastFetchTime: time.toISOString() }),
      
      setNextFetchTime: (time: Date) => set({ nextFetchTime: time.toISOString() })
    }),
    {
      name: 'auto-fetch-storage', // Name for localStorage
      partialize: (state) => ({
        // Only persist these fields
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        duration: state.duration,
        interval: state.interval,
        timeRemaining: state.timeRemaining,
        fetchCount: state.fetchCount,
        successCount: state.successCount,
        errorCount: state.errorCount,
        lastFetchTime: state.lastFetchTime,
        statusMessage: state.statusMessage,
        recentData: state.recentData,
      }),
    }
  )
);

// Utility functions
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return 'N/A';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  } catch (error) {
    return 'Invalid time';
  }
}

// Global timers
let timerInterval: NodeJS.Timeout | null = null;
let fetchInterval: NodeJS.Timeout | null = null;

// Initialize timers if we already have a running state
export function initializeTimers() {
  const state = useAutoFetchStore.getState();
  
  // Clear any existing intervals first
  if (timerInterval) clearInterval(timerInterval);
  if (fetchInterval) clearInterval(fetchInterval);
  
  // Start the timer if we're running
  if (state.isRunning && !state.isPaused) {
    // Timer for counting down
    timerInterval = setInterval(() => {
      useAutoFetchStore.getState().decrementTimeRemaining();
    }, 1000);
    
    // Timer for fetching data
    fetchInterval = setInterval(() => {
      useAutoFetchStore.getState().fetchData();
    }, state.interval * 1000);
  }
}

// Function to start timers
export function startTimers() {
  const state = useAutoFetchStore.getState();
  
  // Clear any existing intervals first
  if (timerInterval) clearInterval(timerInterval);
  if (fetchInterval) clearInterval(fetchInterval);
  
  // Only start if running and not paused
  if (state.isRunning && !state.isPaused) {
    // Timer for counting down
    timerInterval = setInterval(() => {
      useAutoFetchStore.getState().decrementTimeRemaining();
    }, 1000);
    
    // Timer for fetching data
    fetchInterval = setInterval(() => {
      useAutoFetchStore.getState().fetchData();
    }, state.interval * 1000);
  }
}

// Function to stop timers
export function stopTimers() {
  if (timerInterval) clearInterval(timerInterval);
  if (fetchInterval) clearInterval(fetchInterval);
  timerInterval = null;
  fetchInterval = null;
}

// Function to restart timers (e.g., when changing interval)
export function restartTimers() {
  stopTimers();
  startTimers();
}