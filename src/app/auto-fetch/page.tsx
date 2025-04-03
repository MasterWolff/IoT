'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, ClockIcon, DollarSignIcon, TimerIcon, TimerResetIcon, ClipboardCheckIcon, RotateCw } from "lucide-react";
import { format } from 'date-fns';

export default function AutoFetchPage() {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState(5); // Duration in minutes
  const [interval, setInterval] = useState(5); // Interval in seconds
  const [timeRemaining, setTimeRemaining] = useState(0); // Time remaining in seconds
  const [fetchCount, setFetchCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [nextFetchTime, setNextFetchTime] = useState<Date | null>(null);
  const [recentData, setRecentData] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to start');
  
  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Effects
  
  // Effect for the main countdown timer
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else if (isRunning && timeRemaining <= 0) {
      // Timer has ended
      handleStop();
    }
  }, [isRunning, isPaused, timeRemaining]);
  
  // Effect for scheduling the next data fetch
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Schedule the next fetch
      fetchTimerRef.current = setTimeout(() => {
        fetchData();
      }, interval * 1000);
      
      // Update next fetch time
      const next = new Date();
      next.setSeconds(next.getSeconds() + interval);
      setNextFetchTime(next);
      
      return () => {
        if (fetchTimerRef.current) {
          clearTimeout(fetchTimerRef.current);
          setNextFetchTime(null);
        }
      };
    }
  }, [isRunning, isPaused, interval, fetchCount, lastFetchTime]);
  
  // Handler functions
  const handleStart = () => {
    // Convert minutes to seconds
    const totalSeconds = duration * 60;
    setTimeRemaining(totalSeconds);
    setIsRunning(true);
    setFetchCount(0);
    setSuccessCount(0);
    setErrorCount(0);
    setLastFetchTime(null);
    setRecentData([]);
    setStatusMessage('Starting data collection...');
    
    // Fetch data immediately
    fetchData();
  };
  
  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(0);
    setNextFetchTime(null);
    setStatusMessage('Data collection stopped');
    
    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }
  };
  
  const handlePause = () => {
    setIsPaused(!isPaused);
    setStatusMessage(isPaused ? 'Data collection resumed' : 'Data collection paused');
    
    // Clear the fetch timer when pausing
    if (!isPaused && fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
      setNextFetchTime(null);
    }
  };
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setStatusMessage('Generating test sensor data...');
      
      // Record fetch time
      const fetchTime = new Date();
      setLastFetchTime(fetchTime);
      setFetchCount(prev => prev + 1);
      
      // Fetch data directly from the test endpoint
      const response = await fetch('/api/test-arduino-data');
      const data = await response.json();
      
      // Debug - log the entire response
      console.log('API Response:', data);
      
      if (data.success) {
        setSuccessCount(prev => prev + 1);
        setStatusMessage(`Successfully saved test sensor data`);
        
        // The data is already in the right format, just use it directly
        setRecentData(prev => {
          // Create a simple wrapper around the saved data that matches our display format
          const newItem = {
            id: new Date().getTime(), // Just for a key
            timestamp: new Date().toISOString(),
            data: data.saved_data
          };
          
          // Add new data to the beginning of the array
          return [newItem, ...prev].slice(0, 10);
        });
      } else {
        setErrorCount(prev => prev + 1);
        setStatusMessage(`Error: ${data.error || 'Failed to generate test data'}`);
      }
    } catch (error) {
      setErrorCount(prev => prev + 1);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Failed to generate test data'}`);
      console.error('Error generating test data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format timestamp
  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'N/A';
    return format(date, 'HH:mm:ss');
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
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
                onClick={fetchData}
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
                      <TableCell>{format(new Date(data.timestamp), 'HH:mm:ss')}</TableCell>
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