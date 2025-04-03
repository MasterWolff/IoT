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
  
  // Function to refresh data display - this is called when AutoFetchDataListener detects new data
  const fetchData = () => {
    console.log('Refreshing displayed data from store');
    // The data is already in the store, we just need to trigger a re-render
    // This could be extended to fetch additional data if needed
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
    <div className="container mx-auto py-6 space-y-8">
      <AutoFetchDataListener onDataUpdate={fetchData} />
      
      <div>
        <h1 className="text-3xl font-bold mb-2">Automatic Data Collection</h1>
        <p className="text-muted-foreground">
          Configure and run automatic data collection from Arduino Cloud for a set duration.
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
                  <TableHead>Mold Risk</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentData.map((item, index) => {
                  const data = item.data;
                  if (!data) return null;
                  
                  return (
                    <TableRow key={`${index}-${item.id}`}>
                      <TableCell>{data.painting_id ? data.painting_id.substring(0, 8) : 'N/A'}</TableCell>
                      <TableCell>{data.device_id ? data.device_id.substring(0, 8) : 'N/A'}</TableCell>
                      <TableCell>{data.temperature !== null ? `${Number(data.temperature).toFixed(1)}°C` : 'N/A'}</TableCell>
                      <TableCell>{data.humidity !== null ? `${Number(data.humidity).toFixed(1)}%` : 'N/A'}</TableCell>
                      <TableCell>{data.co2concentration !== null ? `${data.co2concentration} ppm` : 'N/A'}</TableCell>
                      <TableCell>{data.airpressure !== null ? `${Number(data.airpressure).toFixed(1)} hPa` : 'N/A'}</TableCell>
                      <TableCell>{data.moldrisklevel !== null ? data.moldrisklevel : 'N/A'}</TableCell>
                      <TableCell>{formatTimestamp(data.timestamp)}</TableCell>
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