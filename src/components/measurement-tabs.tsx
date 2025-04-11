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

// Import our unified alert service
import { exceedsThresholds as checkThresholds } from '@/lib/alertService';

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
  illuminance: number | null;
  paintings: {
    name: string;
    artist: string;
    painting_materials?: {
      materials: {
        threshold_temperature_lower: number | null;
        threshold_temperature_upper: number | null;
        threshold_humidity_lower: number | null;
        threshold_humidity_upper: number | null;
        threshold_co2concentration_lower: number | null;
        threshold_co2concentration_upper: number | null;
        threshold_moldrisklevel_lower: number | null;
        threshold_moldrisklevel_upper: number | null;
        threshold_airpressure_lower: number | null;
        threshold_airpressure_upper: number | null;
        threshold_illuminance_lower: number | null;
        threshold_illuminance_upper: number | null;
      };
    }[];
  };
  devices: {
    name: string;
    status: string;
    // Other device fields if needed
  };
};

export function MeasurementTabs() {
  const [measurements, setMeasurements] = useState<EnvironmentalMeasurement[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  const fetchEnvironmentalData = useCallback(async (options: {
    showLoading?: boolean
  } = { showLoading: false }) => {
    try {
      if (options.showLoading) {
        setLoading(true);
      }
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

      // Also fetch alerts to use for status determination
      const alertsResponse = await fetch('/api/alerts?status=active');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        if (alertsData.success && alertsData.alerts) {
          setAlerts(alertsData.alerts);
          console.log('Active alerts for measurement status:', alertsData.alerts.length);
        }
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
    // Initial fetch with loading indicator
    fetchEnvironmentalData({ showLoading: true });
  }, [fetchEnvironmentalData]);

  // Handler for data updates from the DashboardRefresher
  const handleDataUpdate = useCallback(() => {
    console.log('Data update received in measurement tabs');
    // Refresh data without loading state
    fetchEnvironmentalData({ showLoading: false });
  }, [fetchEnvironmentalData]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchEnvironmentalData({ showLoading: true });
  };

  // Helper function to format timestamp
  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (err) {
      return 'Unknown';
    }
  };

  // Helper to check for active alerts
  const checkForActiveAlert = (measurement: EnvironmentalMeasurement, type: string): boolean => {
    // Check if there's an alert that matches this measurement's painting and environmental attribute
    const matchingAlerts = alerts.filter(alert => 
      alert.painting_id === measurement.painting_id && 
      ((type === 'co2concentration' && alert.alert_type === 'co2') ||
       (type === 'moldrisklevel' && alert.alert_type === 'mold_risk_level') ||
       alert.alert_type === type)
    );
    
    return matchingAlerts.length > 0;
  };

  // Helper to check if a value exceeds thresholds
  const exceedsThresholds = (measurement: EnvironmentalMeasurement, type: 'temperature' | 'humidity' | 'co2concentration' | 'airpressure' | 'moldrisklevel' | 'illuminance'): boolean => {
    const value = measurement[type];
    if (value === null) return false;
    
    // Check if there's an active alert already
    if (checkForActiveAlert(measurement, type)) {
      return true;
    }
    
    // Use our unified alert service to check thresholds
    const result = checkThresholds(measurement, type);
    return result.exceeds;
  };

  // Update cell styling to use the threshold check
  const getCellStyle = (measurement: EnvironmentalMeasurement, type: 'temperature' | 'humidity' | 'co2concentration' | 'airpressure' | 'moldrisklevel' | 'illuminance'): string => {
    return exceedsThresholds(measurement, type) ? "font-medium text-amber-600" : "";
  };

  // Helper function to determine status badge
  const getStatusBadge = (measurement: EnvironmentalMeasurement, type: 'temperature' | 'humidity' | 'co2concentration' | 'airpressure' | 'moldrisklevel' | 'illuminance') => {
    const value = measurement[type];
    if (value === null) return <Badge variant="outline">No data</Badge>;

    // Use the exceedsThresholds function for consistency
    if (exceedsThresholds(measurement, type)) {
      return <Badge variant="warning">Alert</Badge>;
    }
    
    // If no threshold is exceeded, display as normal
    return <Badge variant="success">Normal</Badge>;
  };

  // Filter and sort measurements for each tab
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
    
  const illuminationMeasurements = measurements
    .filter(m => m.illuminance !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <section>
      {/* Add the dashboard refresher */}
      <DashboardRefresher onDataUpdate={handleDataUpdate} />
      
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
          <TabsTrigger value="illumination" className="px-6 py-3 text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center gap-2 rounded-md">
            <SunIcon className="h-4 w-4" />
            Illumination
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
                            <TableCell className={getCellStyle(measurement, 'temperature')}>
                              {measurement.temperature !== null ? `${measurement.temperature.toFixed(1)}°C` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement, 'temperature')}
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
                            <TableCell className={getCellStyle(measurement, 'humidity')}>
                              {measurement.humidity !== null ? `${measurement.humidity}%` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement, 'humidity')}
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
                            <TableCell className={getCellStyle(measurement, 'co2concentration')}>
                              {measurement.co2concentration !== null ? `${measurement.co2concentration} ppm` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement, 'co2concentration')}
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
                            <TableCell className={getCellStyle(measurement, 'airpressure')}>
                              {measurement.airpressure !== null ? `${measurement.airpressure.toFixed(1)} hPa` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement, 'airpressure')}
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
                            <TableCell className={getCellStyle(measurement, 'moldrisklevel')}>
                              {measurement.moldrisklevel !== null ? `Level ${measurement.moldrisklevel}` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement, 'moldrisklevel')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="illumination">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SunIcon className="h-5 w-5 text-muted-foreground" />
                    Illumination Readings
                  </CardTitle>
                  <CardDescription>Last {illuminationMeasurements.length} illumination readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {illuminationMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No illumination measurements available</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[30%]">Painting</TableHead>
                          <TableHead>Illumination</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {illuminationMeasurements.map((measurement) => (
                          <TableRow key={measurement.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{measurement.paintings?.name || 'Unknown'}</TableCell>
                            <TableCell className={getCellStyle(measurement, 'illuminance')}>
                              {measurement.illuminance !== null ? `${measurement.illuminance} lux` : 'N/A'}
                            </TableCell>
                            <TableCell>{formatTime(measurement.timestamp)}</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(measurement, 'illuminance')}
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