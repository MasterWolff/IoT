'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClockIcon, TimerIcon, TimerResetIcon, RotateCw } from "lucide-react";
import { format } from 'date-fns';
import AutoFetchDataListener from "@/components/DashboardRefresher";
import { 
  useAutoFetchStore, 
  formatTime, 
  formatTimestamp, 
  initializeTimers,
  startTimers,
  stopTimers,
  restartTimers
} from '@/lib/autoFetchService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Add type definition for DataItem
type DataItem = {
  id: string;
  timestamp: string;
  data: any;
  paintingName?: string;
};

// Add this helper function before the Auto-Fetch page component
const renderSensorValue = (value: any, unit: string) => {
  if (value === undefined || value === null) {
    return 'N/A';
  }
  
  // Format numeric values
  if (typeof value === 'number') {
    if (unit === '°C' || unit === '%' || unit === 'hPa') {
      return `${Number(value).toFixed(1)}${unit}`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  }
  
  return `${value}${unit ? ` ${unit}` : ''}`;
};

export default function AutoFetchPage() {
  // State from the global store
  const {
    isRunning,
    isPaused,
    duration,
    interval,
    timeRemaining,
    fetchCount,
    successCount,
    errorCount,
    lastFetchTime,
    nextFetchTime,
    statusMessage,
    recentData,
    start,
    stop,
    pause,
    fetchData: storeFetchData,
    setDuration,
    setInterval
  } = useAutoFetchStore();
  
  // UI loading state
  const [loading, setLoading] = useState(false);
  
  // State to force re-renders without page refresh
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Track if there's an authentication error
  const [hasAuthError, setHasAuthError] = useState(false);
  
  // Function to refresh data display - this is called when AutoFetchDataListener detects new data
  const fetchData = () => {
    console.log('Refreshing displayed data from store');
    // The data is already in the store, we just need to trigger a re-render
    
    // Add diagnostic logging to verify the data that's being displayed
    console.log('DIAGNOSTIC: Data in store that should be saved to database:', {
      recentDataCount: useAutoFetchStore.getState().recentData.length,
      latestDataSample: useAutoFetchStore.getState().recentData[0],
      missingStep: 'This data is displayed but not sent to store-arduino endpoint'
    });
    
    // Force a re-render by updating a state variable without changing the whole page
    setLastRefresh(new Date());
  };
  
  // Initialize timers when component mounts or state changes
  useEffect(() => {
    initializeTimers();
    
    // Cleanup when component unmounts
    return () => {
      // We don't stop the timers on unmount to let it run in background
    };
  }, []);
  
  // Effect to restart timers when interval changes
  useEffect(() => {
    if (isRunning && !isPaused) {
      restartTimers();
    }
  }, [interval, isRunning, isPaused]);
  
  // Update the auth error state based on status message
  useEffect(() => {
    if (statusMessage.toLowerCase().includes('authentication error')) {
      setHasAuthError(true);
    } else if (isRunning && !statusMessage.toLowerCase().includes('error')) {
      setHasAuthError(false);
    }
  }, [statusMessage, isRunning]);
  
  // Handler for start button
  const handleStart = () => {
    start();
    startTimers();
  };
  
  // Handler for stop button
  const handleStop = () => {
    stop();
    stopTimers();
  };
  
  // Handler for pause button
  const handlePause = () => {
    pause();
    if (!isPaused) {
      // If we're about to pause
      stopTimers();
    } else {
      // If we're about to resume
      startTimers();
    }
  };
  
  // Handler for fetch now button
  const handleFetchNow = async () => {
    setLoading(true);
    await storeFetchData();
    setLoading(false);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Auto Fetch Data</h1>
      
      {hasAuthError && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <AlertTitle>Authentication Error</AlertTitle>
          </div>
          <AlertDescription>
            <p className="mt-2">Your Arduino Cloud API credentials are invalid or have expired.</p>
            <p className="mt-1">Please update your ARDUINO_CLOUD_CLIENT_ID and ARDUINO_CLOUD_CLIENT_SECRET in your environment variables.</p>
            <div className="mt-3">
              <a 
                href="https://arduino.github.io/arduino-cloud-client/v4.1.0/authentication/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Learn how to get new credentials
              </a>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <AutoFetchDataListener onDataUpdate={fetchData} />
      
      <div>
        <h1 className="text-3xl font-bold mb-2">Automatic Data Collection</h1>
        <p className="text-muted-foreground">
          Configure and run automatic data collection from Arduino Cloud at regular intervals. This fetches real sensor readings from your IoT devices.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set up your data collection parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input 
                id="duration" 
                type="number" 
                min="1" 
                max="60" 
                value={duration} 
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Fetch Interval (seconds)</Label>
              <Input 
                id="interval" 
                type="number" 
                min="5" 
                max="60" 
                value={interval} 
                onChange={(e) => setInterval(Number(e.target.value))}
                disabled={isRunning}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleStop}
              disabled={!isRunning}
            >
              Stop
            </Button>
            <Button 
              variant={isPaused ? "default" : "outline"} 
              onClick={handlePause}
              disabled={!isRunning}
            >
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <Button 
              onClick={handleStart}
              disabled={isRunning}
            >
              Start
            </Button>
          </CardFooter>
        </Card>
        
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current data collection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span>Time Remaining:</span>
              </div>
              <span className="font-mono text-lg font-bold">
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TimerIcon className="h-4 w-4 text-muted-foreground" />
                <span>Last Fetch:</span>
              </div>
              <span>{formatTimestamp(lastFetchTime)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TimerResetIcon className="h-4 w-4 text-muted-foreground" />
                <span>Next Fetch:</span>
              </div>
              <span>{formatTimestamp(nextFetchTime)}</span>
            </div>
            
            <div className="pt-2">
              <Badge variant={isRunning ? (isPaused ? "outline" : "default") : "secondary"} className="w-full justify-center py-1 text-center">
                {isRunning 
                  ? (isPaused ? "PAUSED" : "RUNNING") 
                  : "STOPPED"}
              </Badge>
            </div>
            
            <div className="pt-2">
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fetching data...</span>
                </div>
              )}
              <p className="text-sm">{statusMessage}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>Data collection metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3">
                <span className="text-xs uppercase text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{fetchCount}</span>
                <span className="text-xs text-muted-foreground">Requests</span>
              </div>
              
              <div className="flex flex-col items-center justify-center bg-green-50 rounded-lg p-3">
                <span className="text-xs uppercase text-green-600">Success</span>
                <span className="text-2xl font-bold text-green-600">{successCount}</span>
                <span className="text-xs text-green-600">Requests</span>
              </div>
              
              <div className="flex flex-col items-center justify-center bg-red-50 rounded-lg p-3">
                <span className="text-xs uppercase text-red-600">Errors</span>
                <span className="text-2xl font-bold text-red-600">{errorCount}</span>
                <span className="text-xs text-red-600">Requests</span>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={handleFetchNow}
                disabled={loading || (!isRunning && recentData.length === 0)}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Fetch Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Data */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Data</CardTitle>
          <CardDescription>The 10 most recent data points collected</CardDescription>
        </CardHeader>
        <CardContent>
          {recentData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No data collected yet. Start the collection process to see data here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Painting ID</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Humidity</TableHead>
                  <TableHead>CO₂</TableHead>
                  <TableHead>Air Pressure</TableHead>
                  <TableHead>Illumination</TableHead>
                  <TableHead>Mold Risk</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentData.map((item, index) => {
                  const data = item.data;
                  if (!data) return null;
                  
                  // Extract sensor values from properties if available
                  let temperature = null;
                  let humidity = null;
                  let co2 = null;
                  let pressure = null;
                  let moldRisk = null;
                  let illumination = null;
                  
                  // Check if data contains properties array
                  if (data.properties && Array.isArray(data.properties)) {
                    // Extract values from properties
                    for (const prop of data.properties) {
                      if (prop.variable_name === 'temperature') {
                        temperature = prop.last_value;
                      } else if (prop.variable_name === 'humidity') {
                        humidity = prop.last_value;
                      } else if (prop.variable_name === 'pressure' || prop.variable_name === 'airPressure' || prop.variable_name === 'air_pressure') {
                        pressure = prop.last_value;
                      } else if (prop.variable_name === 'co2Concentration' || prop.variable_name === 'co2') {
                        co2 = prop.last_value;
                      } else if (prop.variable_name === 'moldRiskLevel' || prop.variable_name === 'moldRisk') {
                        moldRisk = prop.last_value;
                      } else if (prop.variable_name === 'illumination' || prop.variable_name === 'illuminance' || prop.variable_name === 'light' || prop.variable_name === 'lightLevel') {
                        illumination = prop.last_value;
                      }
                    }
                    
                    // For debugging - log all property names
                    if (index === 0) {
                      console.log('Available properties:', data.properties.map((p: any) => p.variable_name));
                      
                      // Debug the painting ID display issue
                      console.log('DIAGNOSTIC: Painting ID display issue:', {
                        paintingName: item.paintingName,
                        dataPaintingName: data.paintingName,
                        thingId: data.thingId,
                        thingName: data.thingName,
                        problem: 'Using thing name instead of actual painting ID from database'
                      });
                    }
                  }
                  
                  return (
                    <TableRow key={`${index}-${item.id}`}>
                      <TableCell>
                        {/* Try to find a better painting name or ID to display */}
                        {localStorage.getItem(`painting_name_${data.thingId}`) || 
                        (item.paintingName !== data.thingName 
                          ? item.paintingName 
                          : "Unknown Painting")}
                      </TableCell>
                      <TableCell>{data.thingId ? data.thingId.substring(0, 8) : 'N/A'}</TableCell>
                      <TableCell>
                        {renderSensorValue(
                          data.realTimeValues?.temperature || 
                          data.directValues?.temperature || 
                          data.rawSensorValues?.temperature || 
                          temperature, 
                          '°C'
                        )}
                        {data.realTimeValues?.temperature && 
                          <div className="text-xs text-green-600 font-medium">Real-time</div>
                        }
                      </TableCell>
                      <TableCell>
                        {renderSensorValue(
                          data.realTimeValues?.humidity || 
                          data.directValues?.humidity || 
                          data.rawSensorValues?.humidity || 
                          humidity, 
                          '%'
                        )}
                        {data.realTimeValues?.humidity && 
                          <div className="text-xs text-green-600 font-medium">Real-time</div>
                        }
                      </TableCell>
                      <TableCell>
                        {renderSensorValue(
                          data.realTimeValues?.co2Concentration || 
                          data.directValues?.co2Concentration || 
                          data.rawSensorValues?.co2Concentration || 
                          co2, 
                          'ppm'
                        )}
                        {data.realTimeValues?.co2Concentration && 
                          <div className="text-xs text-green-600 font-medium">Real-time</div>
                        }
                      </TableCell>
                      <TableCell>
                        {renderSensorValue(
                          data.realTimeValues?.airPressure || 
                          data.directValues?.airPressure || 
                          data.rawSensorValues?.airPressure || 
                          pressure, 
                          'hPa'
                        )}
                        {data.realTimeValues?.airPressure && 
                          <div className="text-xs text-green-600 font-medium">Real-time</div>
                        }
                      </TableCell>
                      <TableCell>
                        {renderSensorValue(
                          data.realTimeValues?.illuminance || 
                          data.directValues?.illuminance || 
                          data.rawSensorValues?.illuminance || 
                          illumination, 
                          'lux'
                        )}
                        {data.realTimeValues?.illuminance && 
                          <div className="text-xs text-green-600 font-medium">Real-time</div>
                        }
                      </TableCell>
                      <TableCell>
                        {renderSensorValue(
                          data.realTimeValues?.moldRiskLevel || 
                          data.directValues?.moldRiskLevel || 
                          data.rawSensorValues?.moldRiskLevel || 
                          moldRisk, 
                          ''
                        )}
                        {data.realTimeValues?.moldRiskLevel && 
                          <div className="text-xs text-green-600 font-medium">Real-time</div>
                        }
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(data.fetchTimestamp || item.timestamp)}
                        {data.realTimeValues && Object.keys(data.realTimeValues).length > 0 && 
                          <div className="text-xs text-green-600 font-medium">
                            Arduino Cloud
                          </div>
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 