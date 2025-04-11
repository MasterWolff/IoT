'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { getPaintingById } from '@/lib/clientApi';
import { Painting, EnvironmentalData } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { LineChart } from "../../../components/ui/line-chart";
import { AlertTriangle, Bell, X, Filter, SortDesc } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button";

interface PaintingDetails extends Painting {
  painting_materials: Array<{
    material_id: string;
    materials: {
      name: string;
      description: string | null;
    };
  }>;
  environmental_data: Array<{
    id: string;
    painting_id: string;
    device_id: string;
    timestamp: string;
    temperature: number | null;
    humidity: number | null;
    co2concentration: number | null;
    airpressure: number | null;
    moldrisklevel: number | null;
    illuminance: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

interface Alert {
  id: string;
  painting_id: string;
  device_id: string;
  alert_type: 'temperature' | 'humidity' | 'co2' | 'light';
  threshold_value: number;
  actual_value: number;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
}

export default function PaintingDetailsPage({ params }: { params: { id: string } }) {
  const paintingId = params.id;
  const [painting, setPainting] = useState<PaintingDetails | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [alertSort, setAlertSort] = useState<string>("latest");

  useEffect(() => {
    async function fetchPaintingDetails() {
      try {
        const data = await getPaintingById(paintingId);
        if (!data) {
          throw new Error('Painting not found');
        }
        setPainting(data as PaintingDetails);
        console.log('Environmental data received:', data.environmental_data);

        // Get public URL for the image if image_path exists
        if (data.image_path) {
          const fileName = data.image_path.split('/').pop(); // Get just the filename
          const { data: publicUrl } = supabase
            .storage
            .from('painting-images')
            .getPublicUrl(fileName || '');
          setImageUrl(publicUrl.publicUrl);
        }

        // Fetch alerts for this painting
        const { data: alertsData, error: alertsError } = await supabase
          .from('alerts')
          .select('*')
          .eq('painting_id', paintingId)
          .order('created_at', { ascending: false });

        if (alertsError) {
          console.error('Error fetching alerts:', alertsError);
        } else {
          setAlerts(alertsData as Alert[]);
        }
      } catch (err) {
        console.error('Error fetching painting details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load painting details');
      } finally {
        setLoading(false);
      }
    }

    fetchPaintingDetails();
  }, [paintingId]);

  if (loading) {
    return <div className="p-8">Loading painting details...</div>;
  }

  if (error || !painting) {
    return <div className="p-8 text-red-500">Error: {error || 'Painting not found'}</div>;
  }

  const chartData = painting.environmental_data?.map(data => ({
    time: format(new Date(data.created_at), 'HH:mm:ss'),
    Temperature: Number(data.temperature) || 0,
    Humidity: Number(data.humidity) || 0,
    CO2: Number(data.co2concentration) || 0,
    'Air Pressure': Number(data.airpressure) || 0,
    'Mold Risk': Number(data.moldrisklevel) || 0,
    Illumination: Number(data.illuminance) || 0
  })).sort((a, b) => {
    // Sort by time to ensure proper line chart display
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  }) || [];
  
  console.log('Chart data created:', chartData);
  
  const metrics = {
    temperature: chartData.map(d => d.Temperature),
    humidity: chartData.map(d => d.Humidity),
    co2: chartData.map(d => d.CO2),
    light: chartData.map(d => d.Illumination),
    airpressure: chartData.map(d => d['Air Pressure']),
    moldRisk: chartData.map(d => d['Mold Risk'])
  };

  const valueFormatter = (number: number) => `${number.toFixed(1)}`;

  // Get color for alert type
  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'temperature': return 'bg-orange-100 text-orange-800';
      case 'humidity': return 'bg-blue-100 text-blue-800';
      case 'co2': return 'bg-green-100 text-green-800';
      case 'light': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Group alerts by type and resolved status
  const groupedAlerts = alerts.reduce((acc, alert) => {
    const key = `${alert.alert_type}-${alert.resolved}`;
    if (!acc[key]) {
      acc[key] = {
        type: alert.alert_type,
        resolved: alert.resolved,
        count: 0,
        latest: null
      };
    }
    acc[key].count++;
    // Track the latest alert in each group
    if (!acc[key].latest || new Date(alert.created_at) > new Date(acc[key].latest.created_at)) {
      acc[key].latest = alert;
    }
    return acc;
  }, {} as Record<string, { type: string; resolved: boolean; count: number; latest: Alert | null }>);

  // Convert to array and sort by resolved status and then created_at
  const alertGroups = Object.values(groupedAlerts).sort((a, b) => {
    // Sort by resolved status first (unresolved first)
    if (a.resolved !== b.resolved) {
      return a.resolved ? 1 : -1;
    }
    // Then sort by creation date (latest first)
    return new Date(b.latest?.created_at || 0).getTime() - new Date(a.latest?.created_at || 0).getTime();
  });

  // Show only top 5 alert groups by default
  const displayedAlertGroups = showAllAlerts ? alertGroups : alertGroups.slice(0, 5);

  return (
    <div className="space-y-8 p-8">
      {/* Painting Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{painting.name}</h1>
          <p className="text-lg text-muted-foreground">by {painting.artist}</p>
        </div>
        <Badge variant="outline">
          {painting.creation_date ? format(new Date(painting.creation_date), 'yyyy') : 'Date unknown'}
        </Badge>
      </div>

      {/* Painting Image and Core Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={painting.name} 
                  className="object-contain w-full h-full rounded-lg"
                />
              ) : (
                <span className="text-muted-foreground">No image available</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {painting.painting_materials.map((pm) => (
                <div key={pm.material_id} className="flex items-start space-x-2">
                  <Badge variant="secondary">{pm.materials.name}</Badge>
                  {pm.materials.description && (
                    <span className="text-sm text-muted-foreground">
                      {pm.materials.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Alerts</span>
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.filter(a => !a.resolved).length} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No alerts recorded for this painting
            </div>
          ) : (
            <div className="space-y-4">
              {displayedAlertGroups.map((group) => {
                const alert = group.latest;
                if (!alert) return null;
                
                return (
                  <div key={`${alert.alert_type}-${alert.resolved}`} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className={`p-2 rounded-full ${alert.resolved ? 'bg-gray-100' : 'bg-red-100'}`}>
                      <Bell className={`h-5 w-5 ${alert.resolved ? 'text-gray-500' : 'text-red-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1)} alert
                        </span>
                        <Badge className={getAlertTypeColor(alert.alert_type)}>
                          {alert.alert_type === 'temperature' ? '°C' : 
                           alert.alert_type === 'humidity' ? '%' : 
                           alert.alert_type === 'co2' ? 'ppm' : 'lux'}
                        </Badge>
                        {group.count > 1 && (
                          <Badge variant="secondary" className="ml-2">
                            +{group.count - 1} more
                          </Badge>
                        )}
                        {alert.resolved && (
                          <Badge variant="outline" className="ml-auto">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Threshold: {alert.threshold_value} | Actual: {alert.actual_value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Latest: {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setDialogOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all alerts ({alerts.length})
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>All Alerts for {painting.name}</span>
              <Badge variant="destructive" className="ml-2">
                {alerts.filter(a => !a.resolved).length} active
              </Badge>
            </DialogTitle>
            <DialogDescription>
              History of all environmental alerts for this painting
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="humidity">Humidity</SelectItem>
                  <SelectItem value="co2">CO2</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="resolved">Resolved only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <SortDesc className="h-4 w-4 text-muted-foreground" />
              <Select value={alertSort} onValueChange={setAlertSort}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="severity">Severity (highest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 my-4">
            {alerts
              .filter(alert => {
                if (alertFilter === "all") return true;
                if (alertFilter === "active") return !alert.resolved;
                if (alertFilter === "resolved") return alert.resolved;
                return alert.alert_type === alertFilter;
              })
              .sort((a, b) => {
                if (alertSort === "latest") {
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                if (alertSort === "oldest") {
                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                }
                // Severity - naive implementation based on how far the value exceeds the threshold
                const aRatio = a.actual_value / a.threshold_value;
                const bRatio = b.actual_value / b.threshold_value;
                return bRatio - aRatio;
              })
              .map(alert => (
                <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className={`p-2 rounded-full ${alert.resolved ? 'bg-gray-100' : 'bg-red-100'}`}>
                    <Bell className={`h-5 w-5 ${alert.resolved ? 'text-gray-500' : 'text-red-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1)} alert
                        </span>
                        <Badge className={getAlertTypeColor(alert.alert_type)}>
                          {alert.alert_type === 'temperature' ? '°C' : 
                          alert.alert_type === 'humidity' ? '%' : 
                          alert.alert_type === 'co2' ? 'ppm' : 'lux'}
                        </Badge>
                      </div>
                      {alert.resolved && (
                        <Badge variant="outline">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-sm text-muted-foreground">
                        Threshold: {alert.threshold_value} | Actual: <span className={alert.resolved ? "" : "text-red-600 font-medium"}>{alert.actual_value}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                    {alert.resolved && alert.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved at: {format(new Date(alert.resolved_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Environmental Data Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Environmental Data</span>
            {chartData.length > 0 && (
              <div className="text-sm font-normal text-muted-foreground flex space-x-4">
                <span>{chartData.length} measurements</span>
                <span>{chartData[0]?.time} - {chartData[chartData.length - 1]?.time}</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="temperature" className="space-y-4">
            <TabsList>
              <TabsTrigger value="temperature">Temperature</TabsTrigger>
              <TabsTrigger value="humidity">Humidity</TabsTrigger>
              <TabsTrigger value="co2">CO2</TabsTrigger>
              <TabsTrigger value="light">Light</TabsTrigger>
              <TabsTrigger value="airpressure">Air Pressure</TabsTrigger>
              <TabsTrigger value="moldRisk">Mold Risk</TabsTrigger>
            </TabsList>

            <TabsContent value="temperature" className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No temperature data available
                </div>
              ) : (
                <div className="w-full h-full border rounded-lg p-4">
                  <h3 className="text-lg font-medium">Temperature Over Time</h3>
                  <p className="text-sm text-muted-foreground">Measured in °C</p>
                  <div className="h-[300px] mt-4">
                    <LineChart
                      data={chartData}
                      categories={["Temperature"]}
                      index="time"
                      colors={["orange"]}
                      valueFormatter={valueFormatter}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="humidity" className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No humidity data available
                </div>
              ) : (
                <div className="w-full h-full border rounded-lg p-4">
                  <h3 className="text-lg font-medium">Humidity Over Time</h3>
                  <p className="text-sm text-muted-foreground">Measured in %</p>
                  <div className="h-[300px] mt-4">
                    <LineChart
                      data={chartData}
                      categories={["Humidity"]}
                      index="time"
                      colors={["blue"]}
                      valueFormatter={valueFormatter}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="co2" className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No CO2 data available
                </div>
              ) : (
                <div className="w-full h-full border rounded-lg p-4">
                  <h3 className="text-lg font-medium">CO2 Levels Over Time</h3>
                  <p className="text-sm text-muted-foreground">Measured in ppm</p>
                  <div className="h-[300px] mt-4">
                    <LineChart
                      data={chartData}
                      categories={["CO2"]}
                      index="time"
                      colors={["green"]}
                      valueFormatter={valueFormatter}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="light" className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No light data available
                </div>
              ) : (
                <div className="w-full h-full border rounded-lg p-4">
                  <h3 className="text-lg font-medium">Light Levels Over Time</h3>
                  <p className="text-sm text-muted-foreground">Measured in lux</p>
                  <div className="h-[300px] mt-4">
                    <LineChart
                      data={chartData}
                      categories={["Illumination"]}
                      index="time"
                      colors={["yellow"]}
                      valueFormatter={valueFormatter}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="airpressure" className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No air pressure data available
                </div>
              ) : (
                <div className="w-full h-full border rounded-lg p-4">
                  <h3 className="text-lg font-medium">Air Pressure Over Time</h3>
                  <p className="text-sm text-muted-foreground">Measured in hPa</p>
                  <div className="h-[300px] mt-4">
                    <LineChart
                      data={chartData}
                      categories={["Air Pressure"]}
                      index="time"
                      colors={["purple"]}
                      valueFormatter={valueFormatter}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="moldRisk" className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No mold risk data available
                </div>
              ) : (
                <div className="w-full h-full border rounded-lg p-4">
                  <h3 className="text-lg font-medium">Mold Risk Level Over Time</h3>
                  <p className="text-sm text-muted-foreground">Risk index</p>
                  <div className="h-[300px] mt-4">
                    <LineChart
                      data={chartData}
                      categories={["Mold Risk"]}
                      index="time"
                      colors={["brown"]}
                      valueFormatter={valueFormatter}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 