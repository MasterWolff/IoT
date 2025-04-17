'use client';

import React from 'react';
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
import { 
  ThermometerIcon, 
  DropletIcon, 
  Wind,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

// Import our unified alert service for threshold checking
import { exceedsThresholds } from '@/lib/alertService';

// Type definition for environmental measurements
export type EnvironmentalMeasurement = {
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
  };
};

interface EnhancedMeasurementTabsProps {
  measurements: EnvironmentalMeasurement[];
  alerts: any[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function EnhancedMeasurementTabs({ 
  measurements, 
  alerts, 
  isLoading, 
  error, 
  onRefresh 
}: EnhancedMeasurementTabsProps) {
  // Helper function to format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      
      // Check if the date is today
      if (date.toDateString() === today.toDateString()) {
        // For today's measurements, show only time
        return format(date, 'h:mm a');
      } else {
        // For older measurements, show date and time
        return format(date, 'MMM d, h:mm a');
      }
    } catch (err) {
      return 'Unknown';
    }
  };

  // Helper to check if a value exceeds thresholds
  const checkThresholds = (measurement: EnvironmentalMeasurement, type: 'temperature' | 'humidity' | 'co2concentration' | 'airpressure' | 'moldrisklevel' | 'illuminance'): { exceeds: boolean, isUpper: boolean | null } => {
    const value = measurement[type];
    if (value === null) return { exceeds: false, isUpper: null };
    
    // Check if there's an active alert already for this measurement and type
    const matchingAlerts = alerts.filter(alert => 
      alert.painting_id === measurement.painting_id && 
      ((type === 'co2concentration' && alert.alert_type === 'co2') ||
       (type === 'moldrisklevel' && alert.alert_type === 'mold_risk_level') ||
       alert.alert_type === type) &&
      alert.status === 'active'
    );
    
    if (matchingAlerts.length > 0) {
      // If there's an existing alert, use its information
      const isUpper = matchingAlerts[0].threshold_exceeded === 'upper';
      return { exceeds: true, isUpper };
    }
    
    // Otherwise, check thresholds directly using the alert service
    const result = exceedsThresholds(measurement, type);
    return { 
      exceeds: result.exceeds, 
      isUpper: result.threshold === 'upper' ? true : 
               result.threshold === 'lower' ? false : null 
    };
  };

  // Helper function for cell styling
  const getCellStyle = (measurement: EnvironmentalMeasurement, type: 'temperature' | 'humidity' | 'co2concentration' | 'airpressure' | 'moldrisklevel' | 'illuminance'): string => {
    const { exceeds } = checkThresholds(measurement, type);
    return exceeds ? "font-medium text-amber-600" : "";
  };

  // Helper function to determine status badge
  const getStatusBadge = (measurement: EnvironmentalMeasurement, type: 'temperature' | 'humidity' | 'co2concentration' | 'airpressure' | 'moldrisklevel' | 'illuminance') => {
    const value = measurement[type];
    if (value === null) return <Badge variant="outline">No data</Badge>;

    const { exceeds, isUpper } = checkThresholds(measurement, type);
    
    if (exceeds) {
      const direction = isUpper ? 'high' : 'low';
      return <Badge variant="warning" className="font-medium">Alert ({direction})</Badge>;
    }
    
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

  return (
    <section>
      {/* Info banner about data source */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-4 text-sm text-blue-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>
          Displaying actual measurement timestamps from the database. Data is only updated when auto-fetch is enabled.
        </span>
      </div>
      
      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="temperature" className="w-full">
        <TabsList className="mb-4 bg-background border rounded-lg p-1 flex h-12 justify-between">
          <TabsTrigger value="temperature" className="flex-1 px-1 md:px-3 py-2 text-sm md:text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center justify-center gap-2 rounded-md">
            <ThermometerIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Temperature</span>
            <span className="sm:hidden">Temp</span>
          </TabsTrigger>
          <TabsTrigger value="humidity" className="flex-1 px-1 md:px-3 py-2 text-sm md:text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center justify-center gap-2 rounded-md">
            <DropletIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Humidity</span>
            <span className="sm:hidden">Humid</span>
          </TabsTrigger>
          <TabsTrigger value="co2" className="flex-1 px-1 md:px-3 py-2 text-sm md:text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center justify-center gap-2 rounded-md">
            <Wind className="h-4 w-4" />
            <span>CO₂</span>
          </TabsTrigger>
          <TabsTrigger value="airPressure" className="flex-1 px-1 md:px-3 py-2 text-sm md:text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center justify-center gap-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Air Pressure</span>
            <span className="sm:hidden">Air</span>
          </TabsTrigger>
          <TabsTrigger value="moldRisk" className="flex-1 px-1 md:px-3 py-2 text-sm md:text-base data-[state=active]:bg-muted data-[state=active]:text-foreground flex items-center justify-center gap-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Mold Risk</span>
            <span className="sm:hidden">Mold</span>
          </TabsTrigger>
        </TabsList>
        
        {isLoading ? (
          <Card className="p-4 sm:p-6 text-center text-muted-foreground">
            Loading measurement data...
          </Card>
        ) : error ? (
          <Card className="p-4 sm:p-6">
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
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <ThermometerIcon className="h-5 w-5 text-muted-foreground" />
                    Temperature Readings
                  </CardTitle>
                  <CardDescription>Last {temperatureMeasurements.length} temperature readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {temperatureMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No temperature measurements available</div>
                  ) : (
                    <div className="overflow-x-auto">
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="humidity">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <DropletIcon className="h-5 w-5 text-muted-foreground" />
                    Humidity Readings
                  </CardTitle>
                  <CardDescription>Last {humidityMeasurements.length} humidity readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {humidityMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No humidity measurements available</div>
                  ) : (
                    <div className="overflow-x-auto">
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="co2">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Wind className="h-5 w-5 text-muted-foreground" />
                    CO₂ Readings
                  </CardTitle>
                  <CardDescription>Last {co2Measurements.length} CO₂ readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {co2Measurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No CO₂ measurements available</div>
                  ) : (
                    <div className="overflow-x-auto">
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="airPressure">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    Air Pressure Readings
                  </CardTitle>
                  <CardDescription>Last {airPressureMeasurements.length} air pressure readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {airPressureMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No air pressure measurements available</div>
                  ) : (
                    <div className="overflow-x-auto">
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="moldRisk">
              <Card className="shadow-sm border-t-2 border-t-blue-300">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    Mold Risk Readings
                  </CardTitle>
                  <CardDescription>Last {moldRiskMeasurements.length} mold risk readings across monitored paintings</CardDescription>
                </CardHeader>
                <CardContent>
                  {moldRiskMeasurements.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No mold risk measurements available</div>
                  ) : (
                    <div className="overflow-x-auto">
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
                    </div>
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