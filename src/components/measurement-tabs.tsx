'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardRefresher from "@/components/DashboardRefresher";
import { 
  ThermometerIcon, 
  DropletIcon, 
  SunIcon, 
  Wind,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from 'date-fns';
import { Button } from './ui/button';

// Type definitions for the environmental data
type EnvironmentalMeasurement = {
  id: string;
  device_id: string;
  painting_id: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  co2concentration: number | null;
  airpressure: number | null;
  moldrisklevel: number | null;
  paintings: {
    name: string;
    artist: string;
    // Other painting fields if needed
  };
  devices: {
    name: string;
    status: string;
    // Other device fields if needed
  };
};

export function MeasurementTabs() {
  const [measurements, setMeasurements] = useState<EnvironmentalMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  const fetchEnvironmentalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the endpoint to fetch environmental data
      const response = await fetch('/api/environmental-data');
      if (!response.ok) {
        throw new Error(`Failed to fetch environmental data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Environmental data response:', data); // Debug log
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        // Data is available
        setMeasurements(data.data);
        console.log('First measurement:', data.data[0]); // Debug: Log first data point
      } else {
        console.warn('No environmental data found or empty array returned');
        setError('No environmental data available. Please add some sensor readings first.');
      }

      // Debug log
      if (!data.temperature && !data.humidity && !data.co2concentration && 
          !data.airpressure && !data.moldrisklevel) {
        console.warn('No measurement values found in the data');
      }
      
      // Update last refresh time
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching environmental data:', err);
      setError('Failed to load measurement data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchEnvironmentalData();
  }, [fetchEnvironmentalData]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchEnvironmentalData();
  };

  // Helper function to format timestamp
  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (err) {
      return 'Unknown';
    }
  };

  // Helper function to determine status badge
  const getStatusBadge = (value: number | null, thresholdLower: number | null = null, thresholdUpper: number | null = null) => {
    if (value === null) return <Badge variant="outline">No data</Badge>;

    // If thresholds are provided, use them to determine alert status
    if ((thresholdLower !== null && value < thresholdLower) || 
        (thresholdUpper !== null && value > thresholdUpper)) {
      return <Badge variant="warning">Alert</Badge>;
    }

    // Default simple thresholds if none provided
    if (value > 25 && thresholdUpper === null) return <Badge variant="warning">Alert</Badge>; // Temperature
    if (value > 65 && thresholdUpper === null) return <Badge variant="warning">Alert</Badge>; // Humidity
    if (value > 200 && thresholdUpper === null) return <Badge variant="warning">Alert</Badge>; // Light
    if (value > 1000 && thresholdUpper === null) return <Badge variant="warning">Alert</Badge>; // CO2
    
    return <Badge variant="success">Normal</Badge>;
  };

  // Filter measurements for each type and get latest few
  const temperatureMeasurements = measurements
    .filter(m => m.temperature !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const humidityMeasurements = measurements
    .filter(m => m.humidity !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const co2Measurements = measurements
    .filter(m => m.co2concentration !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);
    
  const airPressureMeasurements = measurements
    .filter(m => m.airpressure !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);
    
  const moldRiskMeasurements = measurements
    .filter(m => m.moldrisklevel !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <section>
      {/* Add the dashboard refresher */}
      <DashboardRefresher onDataUpdate={fetchEnvironmentalData} />
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Environmental Measurements</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {format(new Date(lastRefresh), 'HH:mm:ss')}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="temperature" className="w-full">
        <TabsList className="mb-4 bg-background border rounded-lg h-14 p-1">
          <TabsTrigger value="temperature" className="px-6 py-3 text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center gap-2 rounded-md">
            <ThermometerIcon className="h-4 w-4" />
            Temperature
          </TabsTrigger>
          <TabsTrigger value="humidity" className="px-6 py-3 text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center gap-2 rounded-md">
            <DropletIcon className="h-4 w-4" />
            Humidity
          </TabsTrigger>
          <TabsTrigger value="co2" className="px-6 py-3 text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center gap-2 rounded-md">
            <Wind className="h-4 w-4" />
            CO2
          </TabsTrigger>
          <TabsTrigger value="airPressure" className="px-6 py-3 text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center gap-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            Air Pressure
          </TabsTrigger>
          <TabsTrigger value="moldRisk" className="px-6 py-3 text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center gap-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            Mold Risk
          </TabsTrigger>
        </TabsList>
        
        {loading ? (
          <Card className="p-6 text-center text-muted-foreground">
            Loading measurement data...
          </Card>
        ) : error ? (
          <Card className="p-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-700">Error</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <TabsContent value="temperature">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThermometerIcon className="h-5 w-5 text-muted-foreground" />
                    Temperature Readings
                  </CardTitle>
                  <CardDescription>Last {temperatureMeasurements.length} temperature readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {temperatureMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No temperature measurements available</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[30%]">Painting</TableHead>
                          <TableHead>Temperature</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {temperatureMeasurements.map((measurement) => (
                          <TableRow key={measurement.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{measurement.paintings?.name || 'Unknown'}</TableCell>
                            <TableCell className={
                              measurement.temperature && measurement.temperature > 25 
                                ? "font-medium text-amber-600" 
                                : ""
                            }>
                              {measurement.temperature !== null ? `${measurement.temperature.toFixed(1)}°C` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement.temperature, 15, 25)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="humidity">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DropletIcon className="h-5 w-5 text-muted-foreground" />
                    Humidity Readings
                  </CardTitle>
                  <CardDescription>Last {humidityMeasurements.length} humidity readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {humidityMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No humidity measurements available</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[30%]">Painting</TableHead>
                          <TableHead>Humidity</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {humidityMeasurements.map((measurement) => (
                          <TableRow key={measurement.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{measurement.paintings?.name || 'Unknown'}</TableCell>
                            <TableCell className={
                              measurement.humidity && measurement.humidity > 65 
                                ? "font-medium text-amber-600" 
                                : ""
                            }>
                              {measurement.humidity !== null ? `${measurement.humidity}%` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement.humidity, 40, 65)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="co2">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wind className="h-5 w-5 text-muted-foreground" />
                    CO₂ Readings
                  </CardTitle>
                  <CardDescription>Last {co2Measurements.length} CO₂ readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {co2Measurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No CO₂ measurements available</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[30%]">Painting</TableHead>
                          <TableHead>CO₂ Level</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {co2Measurements.map((measurement) => (
                          <TableRow key={measurement.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{measurement.paintings?.name || 'Unknown'}</TableCell>
                            <TableCell className={
                              measurement.co2concentration && measurement.co2concentration > 1000 
                                ? "font-medium text-amber-600" 
                                : ""
                            }>
                              {measurement.co2concentration !== null ? `${measurement.co2concentration} ppm` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement.co2concentration, null, 1000)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="airPressure">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    Air Pressure Readings
                  </CardTitle>
                  <CardDescription>Last {airPressureMeasurements.length} air pressure readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {airPressureMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No air pressure measurements available</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[30%]">Painting</TableHead>
                          <TableHead>Air Pressure</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {airPressureMeasurements.map((measurement) => (
                          <TableRow key={measurement.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{measurement.paintings?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              {measurement.airpressure !== null ? `${measurement.airpressure} hPa` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement.airpressure, null, 1000)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="moldRisk">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    Mold Risk Readings
                  </CardTitle>
                  <CardDescription>Last {moldRiskMeasurements.length} mold risk readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {moldRiskMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No mold risk measurements available</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[30%]">Painting</TableHead>
                          <TableHead>Mold Risk Level</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {moldRiskMeasurements.map((measurement) => (
                          <TableRow key={measurement.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{measurement.paintings?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              {measurement.moldrisklevel !== null ? `${measurement.moldrisklevel}` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement.moldrisklevel, null, 100)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </section>
  );
} 