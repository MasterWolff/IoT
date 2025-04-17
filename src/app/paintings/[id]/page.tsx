'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, subDays, isAfter } from 'date-fns';
import { getPaintingById } from '@/lib/clientApi';
import { Painting, EnvironmentalData } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { LineChart } from "../../../components/ui/line-chart";
import { AlertTriangle, Bell, X, Filter, SortDesc, Info, Calendar, User, Thermometer, Droplets, Wind, Bug } from "lucide-react";
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
import { LineChartProps } from '@tremor/react';

interface PaintingDetails extends Painting {
  painting_materials: Array<{
    material_id: string;
    materials: {
      name: string;
      description: string | null;
      threshold_temperature_lower?: number | null;
      threshold_temperature_upper?: number | null;
      threshold_humidity_lower?: number | null;
      threshold_humidity_upper?: number | null;
      threshold_co2concentration_lower?: number | null;
      threshold_co2concentration_upper?: number | null;
      threshold_illuminance_lower?: number | null;
      threshold_illuminance_upper?: number | null;
      threshold_moldrisklevel_lower?: number | null;
      threshold_moldrisklevel_upper?: number | null;
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
  device_id: string | null;
  environmental_data_id: string | null;
  alert_type: string;
  threshold_exceeded: 'upper' | 'lower';
  measured_value: number;
  threshold_value: number;
  status: 'active' | 'dismissed';
  timestamp: string;
  created_at: string;
  updated_at: string | null;
  dismissed_at: string | null;
}

type ChartTooltipProps = {
  payload?: Array<{
    value: number;
    name?: string;
    color?: string;
  }>;
  active?: boolean;
  label?: string;
};

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
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchPaintingDetails() {
      try {
        const data = await getPaintingById(paintingId);
        if (!data) {
          throw new Error('Painting not found');
        }
        
        setPainting(data as PaintingDetails);

        // Get public URL for the image if image_path exists
        if (data.image_path) {
          console.log('Image path from database:', data.image_path);
          
          // Extract just the filename without any painting-images/ prefix
          const fileName = data.image_path.includes('/') 
            ? data.image_path.split('/').pop() 
            : data.image_path;
          
          console.log('Using filename for storage:', fileName);
          
          // Instead of relying on Supabase's URL, construct it manually to avoid encoding issues
          const baseUrl = "https://jyeoknizfpnklmirqpez.supabase.co/storage/v1/object/public/painting-images/";
          const imageUrl = baseUrl + encodeURIComponent(fileName || '');
          
          console.log('Generated public URL:', imageUrl);
          setImageUrl(imageUrl);
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
    return <div className="p-8 flex items-center justify-center h-screen">
      <div className="animate-pulse text-xl">Loading painting details...</div>
    </div>;
  }

  if (error || !painting) {
    return <div className="p-8 text-red-500 flex items-center justify-center h-screen">
      <div className="text-xl">Error: {error || 'Painting not found'}</div>
    </div>;
  }

  // Create chart data correctly sorted by time (latest on right)
  const chartData = painting.environmental_data?.map(data => ({
    time: format(new Date(data.created_at), 'HH:mm:ss'),
    rawTime: new Date(data.created_at),
    Temperature: Number(data.temperature) || 0,
    Humidity: Number(data.humidity) || 0,
    CO2: Number(data.co2concentration) || 0,
    'Air Pressure': Number(data.airpressure) || 0,
    'Mold Risk': Number(data.moldrisklevel) || 0,
    Illumination: Number(data.illuminance) || 0
  })).sort((a, b) => {
    // Sort by time to ensure proper line chart display (oldest to newest)
    return a.rawTime.getTime() - b.rawTime.getTime();
  }) || [];

  // Apply date filter to chart data
  const getFilteredChartData = () => {
    if (dateFilter === "all") {
      return chartData;
    }
    
    const today = startOfDay(new Date());
    const filterDate = dateFilter === "today" 
      ? today 
      : subDays(today, 7); // "week"
    
    return chartData.filter(data => isAfter(data.rawTime, filterDate));
  };
  
  const filteredChartData = getFilteredChartData();
  
  const metrics = {
    temperature: filteredChartData.map(d => d.Temperature),
    humidity: filteredChartData.map(d => d.Humidity),
    co2: filteredChartData.map(d => d.CO2),
    light: filteredChartData.map(d => d.Illumination),
    airpressure: filteredChartData.map(d => d['Air Pressure']),
    moldRisk: filteredChartData.map(d => d['Mold Risk'])
  };

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
    const key = `${alert.alert_type}-${alert.status === 'dismissed'}`;
    if (!acc[key]) {
      acc[key] = {
        type: alert.alert_type,
        resolved: alert.status === 'dismissed',
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

  // Get current environmental metrics
  const latestData = painting.environmental_data.length > 0 
    ? painting.environmental_data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
    : null;
  
  // Count active alerts by type
  const alertCounts = alerts.reduce((acc, alert) => {
    if (alert.status === 'active') {
      acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get first and last timestamp for the time range display
  const getTimeRangeDisplay = () => {
    if (filteredChartData.length === 0) return '';
    
    // Format the first and last timestamps into a readable format with both time and date
    const firstDatapoint = filteredChartData[0]?.rawTime;
    const lastDatapoint = filteredChartData[filteredChartData.length - 1]?.rawTime;
    
    if (!firstDatapoint || !lastDatapoint) return '';
    
    const firstTime = format(firstDatapoint, 'HH:mm:ss');
    const lastTime = format(lastDatapoint, 'HH:mm:ss');
    
    return `${firstTime} - ${lastTime}`;
  };

  // Get thresholds from painting materials
  const getThresholds = (type: string) => {
    if (!painting || !painting.painting_materials || painting.painting_materials.length === 0) {
      return null;
    }

    // Look at all materials and get the most restrictive thresholds
    let lowerThreshold: number | null = null;
    let upperThreshold: number | null = null;

    painting.painting_materials.forEach(pm => {
      const material = pm.materials;
      
      // Map chart type to material threshold fields
      let lowerField: string;
      let upperField: string;
      
      switch (type) {
        case 'Temperature':
          lowerField = 'threshold_temperature_lower';
          upperField = 'threshold_temperature_upper';
          break;
        case 'Humidity':
          lowerField = 'threshold_humidity_lower';
          upperField = 'threshold_humidity_upper';
          break;
        case 'CO2':
          lowerField = 'threshold_co2concentration_lower';
          upperField = 'threshold_co2concentration_upper';
          break;
        case 'Illumination':
          lowerField = 'threshold_illuminance_lower';
          upperField = 'threshold_illuminance_upper';
          break;
        case 'Mold Risk':
          lowerField = 'threshold_moldrisklevel_lower';
          upperField = 'threshold_moldrisklevel_upper';
          break;
        default:
          return null;
      }
      
      // Get thresholds from this material
      const materialLower = material[lowerField as keyof typeof material] as number | null;
      const materialUpper = material[upperField as keyof typeof material] as number | null;
      
      // Update most restrictive thresholds
      if (materialLower !== null) {
        if (lowerThreshold === null || materialLower > lowerThreshold) {
          lowerThreshold = materialLower;
        }
      }
      
      if (materialUpper !== null) {
        if (upperThreshold === null || materialUpper < upperThreshold) {
          upperThreshold = materialUpper;
        }
      }
    });
    
    return { lower: lowerThreshold, upper: upperThreshold };
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="bg-white border rounded-xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Column */}
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-lg  overflow-hidden">
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
          </div>
          
          {/* Details Column */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{painting.name}</h1>
                  <div className="flex items-center mt-2">
                    <User className="h-4 w-4 text-slate-500 mr-2" />
                    <p className="text-lg text-slate-700">{painting.artist}</p>
                  </div>
                  <div className="flex items-center mt-2">
                    <Calendar className="h-4 w-4 text-slate-500 mr-2" />
                    <Badge variant="outline" className="text-sm">
                      {painting.creation_date ? format(new Date(painting.creation_date), 'yyyy') : 'Date unknown'}
                    </Badge>
                  </div>
                </div>
                
                {alerts.filter(a => a.status === 'active').length > 0 && (
                  <Badge variant="outline" className="text-md border-amber-300 bg-amber-50 text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {alerts.filter(a => a.status === 'active').length} active alerts
                  </Badge>
                )}
              </div>
              
              {/* Materials Section */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-3">Materials</h2>
                <div className="flex flex-wrap gap-2">
                  {painting.painting_materials.map((pm) => (
                    <Badge key={pm.material_id} variant="outline" className="text-sm py-1 px-3 bg-gray-50">
                      {pm.materials.name}
                    </Badge>
                  ))}
                </div>
                {painting.painting_materials.some(pm => pm.materials.description) && (
                  <div className="mt-4 space-y-2">
                    {painting.painting_materials
                      .filter(pm => pm.materials.description)
                      .map((pm) => (
                        <div key={`desc-${pm.material_id}`} className="text-sm text-slate-600">
                          <span className="font-medium">{pm.materials.name}:</span> {pm.materials.description}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Environmental Snapshot */}
            {latestData && (
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center">
                    <Thermometer className="h-5 w-5 text-orange-600 mr-2 opacity-70" />
                    <span className="text-sm font-medium text-slate-600">Temperature</span>
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold text-slate-800">{latestData.temperature?.toFixed(1) || '—'}°C</span>
                    {alertCounts['temperature'] > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs border-amber-200 bg-amber-50 text-amber-700">
                        {alertCounts['temperature']} alert{alertCounts['temperature'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center">
                    <Droplets className="h-5 w-5 text-blue-600 mr-2 opacity-70" />
                    <span className="text-sm font-medium text-slate-600">Humidity</span>
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold text-slate-800">{latestData.humidity?.toFixed(1) || '—'}%</span>
                    {alertCounts['humidity'] > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs border-amber-200 bg-amber-50 text-amber-700">
                        {alertCounts['humidity']} alert{alertCounts['humidity'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center">
                    <Wind className="h-5 w-5 text-green-600 mr-2 opacity-70" />
                    <span className="text-sm font-medium text-slate-600">CO₂</span>
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold text-slate-800">{latestData.co2concentration?.toFixed(0) || '—'} ppm</span>
                    {alertCounts['co2'] > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs border-amber-200 bg-amber-50 text-amber-700">
                        {alertCounts['co2']} alert{alertCounts['co2'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center">
                    <Bug className="h-5 w-5 text-amber-600 mr-2 opacity-70" />
                    <span className="text-sm font-medium text-slate-600">Mold Risk</span>
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-semibold text-slate-800">{latestData.moldrisklevel?.toFixed(1) || '—'}</span>
                    {alertCounts['moldrisklevel'] > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs border-amber-200 bg-amber-50 text-amber-700">
                        {alertCounts['moldrisklevel']} alert{alertCounts['moldrisklevel'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="environment" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="environment">Environment Data</TabsTrigger>
          <TabsTrigger value="alerts">Alerts {alerts.filter(a => a.status === 'active').length > 0 && 
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
              {alerts.filter(a => a.status === 'active').length}
            </span>}</TabsTrigger>
        </TabsList>
        
        {/* Environment Data Tab */}
        <TabsContent value="environment">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-white pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl text-slate-800">Environmental Monitoring</CardTitle>
                  <CardDescription className="mt-1">Historical environmental data for this artwork</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {filteredChartData.length > 0 && (
                    <div className="text-sm font-medium text-slate-600">
                      <span>{filteredChartData.length} measurements</span>
                      <span className="ml-2">{getTimeRangeDisplay()}</span>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Button 
                      variant={dateFilter === "today" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDateFilter("today")}
                      className={`text-xs h-7 px-3 ${dateFilter !== "today" ? "bg-white text-slate-700 hover:bg-gray-50" : ""}`}
                    >
                      Today
                    </Button>
                    <Button 
                      variant={dateFilter === "week" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDateFilter("week")}
                      className={`text-xs h-7 px-3 ${dateFilter !== "week" ? "bg-white text-slate-700 hover:bg-gray-50" : ""}`}
                    >
                      Past 7 days
                    </Button>
                    <Button 
                      variant={dateFilter === "all" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDateFilter("all")}
                      className={`text-xs h-7 px-3 ${dateFilter !== "all" ? "bg-white text-slate-700 hover:bg-gray-50" : ""}`}
                    >
                      All time
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-white border-b py-3 px-4">
                <Tabs defaultValue="temperature" className="space-y-4">
                  <div className="overflow-x-auto pb-2 scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    <style jsx global>{`
                      .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    <TabsList className="bg-gray-50 p-1 rounded-full w-fit min-w-full">
                      <TabsTrigger value="temperature" className="rounded-full px-4 py-1.5 data-[state=active]:bg-white flex items-center gap-1">
                        <Thermometer className="h-4 w-4" />Temperature
                      </TabsTrigger>
                      <TabsTrigger value="humidity" className="rounded-full px-4 py-1.5 data-[state=active]:bg-white flex items-center gap-1">
                        <Droplets className="h-4 w-4" />Humidity
                      </TabsTrigger>
                      <TabsTrigger value="co2" className="rounded-full px-4 py-1.5 data-[state=active]:bg-white flex items-center gap-1">
                        <Wind className="h-4 w-4" />CO₂
                      </TabsTrigger>
                      <TabsTrigger value="light" className="rounded-full px-4 py-1.5 data-[state=active]:bg-white">Light</TabsTrigger>
                      <TabsTrigger value="airpressure" className="rounded-full px-4 py-1.5 data-[state=active]:bg-white">Air Pressure</TabsTrigger>
                      <TabsTrigger value="moldRisk" className="rounded-full px-4 py-1.5 data-[state=active]:bg-white flex items-center gap-1">
                        <Bug className="h-4 w-4" />Mold Risk
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="temperature" className="p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-slate-500">
                        {chartData.length > 0 ? "No data for selected time period" : "No temperature data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <h3 className="text-lg font-medium text-slate-800">Temperature Over Time</h3>
                        <p className="text-sm text-slate-500">Measured in °C</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('Temperature') && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getThresholds('Temperature')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Min: {getThresholds('Temperature')?.lower}°C
                              </Badge>
                            )}
                            {getThresholds('Temperature')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Max: {getThresholds('Temperature')?.upper}°C
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[400px] mt-4">
                          <LineChart
                            data={filteredChartData}
                            categories={["Temperature"]}
                            index="time"
                            colors={["orange"]}
                            valueFormatter={(value) => `${value.toFixed(1)}°C`}
                            className="h-full w-full"
                            customTooltip={({ payload }: ChartTooltipProps) => {
                              if (payload && payload.length > 0) {
                                const temperature = payload[0].value as number;
                                const thresholds = getThresholds('Temperature');
                                let statusBadge = <></>;
                                
                                if (thresholds) {
                                  if (thresholds.lower !== null && temperature < thresholds.lower) {
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && temperature > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">Temperature:</span>
                                      <span>{temperature.toFixed(1)}°C {statusBadge}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                            referenceLines={(() => {
                              const lines = [];
                              const thresholds = getThresholds('Temperature');
                              if (thresholds?.lower !== null && thresholds?.lower !== undefined) {
                                lines.push({
                                  y: Number(thresholds.lower),
                                  label: `Min: ${thresholds.lower}°C`,
                                  color: "blue",
                                  strokeDasharray: "4 4"
                                });
                              }
                              if (thresholds?.upper !== null && thresholds?.upper !== undefined) {
                                lines.push({
                                  y: Number(thresholds.upper),
                                  label: `Max: ${thresholds.upper}°C`,
                                  color: "red",
                                  strokeDasharray: "4 4"
                                });
                              }
                              return lines;
                            })()}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="humidity" className="p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-slate-500">
                        {chartData.length > 0 ? "No data for selected time period" : "No humidity data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <h3 className="text-lg font-medium text-slate-800">Humidity Over Time</h3>
                        <p className="text-sm text-slate-500">Measured in %</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('Humidity') && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getThresholds('Humidity')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Min: {getThresholds('Humidity')?.lower}%
                              </Badge>
                            )}
                            {getThresholds('Humidity')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Max: {getThresholds('Humidity')?.upper}%
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[400px] mt-4">
                          <LineChart
                            data={filteredChartData}
                            categories={["Humidity"]}
                            index="time"
                            colors={["blue"]}
                            valueFormatter={(value) => `${value.toFixed(1)}%`}
                            className="h-full w-full"
                            customTooltip={({ payload }: ChartTooltipProps) => {
                              if (payload && payload.length > 0) {
                                const humidity = payload[0].value as number;
                                const thresholds = getThresholds('Humidity');
                                let statusBadge = <></>;
                                
                                if (thresholds) {
                                  if (thresholds.lower !== null && humidity < thresholds.lower) {
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && humidity > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">Humidity:</span>
                                      <span>{humidity.toFixed(1)}% {statusBadge}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                            referenceLines={(() => {
                              const lines = [];
                              const thresholds = getThresholds('Humidity');
                              if (thresholds?.lower !== null && thresholds?.lower !== undefined) {
                                lines.push({
                                  y: Number(thresholds.lower),
                                  label: `Min: ${thresholds.lower}%`,
                                  color: "blue",
                                  strokeDasharray: "4 4"
                                });
                              }
                              if (thresholds?.upper !== null && thresholds?.upper !== undefined) {
                                lines.push({
                                  y: Number(thresholds.upper),
                                  label: `Max: ${thresholds.upper}%`,
                                  color: "red",
                                  strokeDasharray: "4 4"
                                });
                              }
                              return lines;
                            })()}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="co2" className="p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-slate-500">
                        {chartData.length > 0 ? "No data for selected time period" : "No CO₂ data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <h3 className="text-lg font-medium text-slate-800">CO₂ Levels Over Time</h3>
                        <p className="text-sm text-slate-500">Measured in ppm</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('CO2') && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getThresholds('CO2')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Min: {getThresholds('CO2')?.lower} ppm
                              </Badge>
                            )}
                            {getThresholds('CO2')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Max: {getThresholds('CO2')?.upper} ppm
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[400px] mt-4">
                          <LineChart
                            data={filteredChartData}
                            categories={["CO2"]}
                            index="time"
                            colors={["green"]}
                            valueFormatter={(value) => `${value.toFixed(0)} ppm`}
                            className="h-full w-full"
                            customTooltip={({ payload }: ChartTooltipProps) => {
                              if (payload && payload.length > 0) {
                                const co2 = payload[0].value as number;
                                const thresholds = getThresholds('CO2');
                                let statusBadge = <></>;
                                
                                if (thresholds) {
                                  if (thresholds.lower !== null && co2 < thresholds.lower) {
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && co2 > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">CO₂:</span>
                                      <span>{co2.toFixed(0)} ppm {statusBadge}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                            referenceLines={(() => {
                              const lines = [];
                              const thresholds = getThresholds('CO2');
                              if (thresholds?.lower !== null && thresholds?.lower !== undefined) {
                                lines.push({
                                  y: Number(thresholds.lower),
                                  label: `Min: ${thresholds.lower} ppm`,
                                  color: "blue",
                                  strokeDasharray: "4 4"
                                });
                              }
                              if (thresholds?.upper !== null && thresholds?.upper !== undefined) {
                                lines.push({
                                  y: Number(thresholds.upper),
                                  label: `Max: ${thresholds.upper} ppm`,
                                  color: "red",
                                  strokeDasharray: "4 4"
                                });
                              }
                              return lines;
                            })()}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="light" className="p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-slate-500">
                        {chartData.length > 0 ? "No data for selected time period" : "No light data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <h3 className="text-lg font-medium text-slate-800">Light Levels Over Time</h3>
                        <p className="text-sm text-slate-500">Measured in lux</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('Illumination') && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getThresholds('Illumination')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Min: {getThresholds('Illumination')?.lower} lux
                              </Badge>
                            )}
                            {getThresholds('Illumination')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                Max: {getThresholds('Illumination')?.upper} lux
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[400px] mt-4">
                          <LineChart
                            data={filteredChartData}
                            categories={["Illumination"]}
                            index="time"
                            colors={["#FFC107"]}
                            valueFormatter={(value) => `${value.toFixed(1)} lux`}
                            className="h-full w-full"
                            customTooltip={({ payload }: ChartTooltipProps) => {
                              if (payload && payload.length > 0) {
                                const illumination = payload[0].value as number;
                                const thresholds = getThresholds('Illumination');
                                let statusBadge = <></>;
                                
                                if (thresholds) {
                                  if (thresholds.lower !== null && illumination < thresholds.lower) {
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && illumination > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">Illumination:</span>
                                      <span>{illumination.toFixed(1)} lux {statusBadge}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                            referenceLines={(() => {
                              const lines = [];
                              const thresholds = getThresholds('Illumination');
                              if (thresholds?.lower !== null && thresholds?.lower !== undefined) {
                                lines.push({
                                  y: Number(thresholds.lower),
                                  label: `Min: ${thresholds.lower} lux`,
                                  color: "blue",
                                  strokeDasharray: "4 4"
                                });
                              }
                              if (thresholds?.upper !== null && thresholds?.upper !== undefined) {
                                lines.push({
                                  y: Number(thresholds.upper),
                                  label: `Max: ${thresholds.upper} lux`,
                                  color: "red",
                                  strokeDasharray: "4 4"
                                });
                              }
                              return lines;
                            })()}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="airpressure" className="p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-slate-500">
                        {chartData.length > 0 ? "No data for selected time period" : "No air pressure data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <h3 className="text-lg font-medium text-slate-800">Air Pressure Over Time</h3>
                        <p className="text-sm text-slate-500">Measured in hPa</p>
                        <div className="h-[400px] mt-4">
                          <LineChart
                            data={filteredChartData}
                            categories={["Air Pressure"]}
                            index="time"
                            colors={["purple"]}
                            valueFormatter={(value) => `${value.toFixed(1)} hPa`}
                            className="h-full w-full"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="moldRisk" className="p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-slate-500">
                        {chartData.length > 0 ? "No data for selected time period" : "No mold risk data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <h3 className="text-lg font-medium text-slate-800">Mold Risk Level Over Time</h3>
                        <p className="text-sm text-slate-500">Risk index</p>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Level 0: Safe
                          </Badge>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Level 1: Low Risk
                          </Badge>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            Level 2: Medium Risk
                          </Badge>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Level 3: High Risk
                          </Badge>
                        </div>
                        
                        <div className="h-[400px] mt-4">
                          <LineChart
                            data={filteredChartData}
                            categories={["Mold Risk"]}
                            index="time"
                            colors={["#8B4513"]} 
                            valueFormatter={(value: number) => `Level ${Math.round(value)}`}
                            className="h-full w-full"
                            customTooltip={({ payload }: ChartTooltipProps) => {
                              if (payload && payload.length > 0) {
                                const moldRisk = Math.round(payload[0].value as number);
                                let statusBadge = <></>;
                                let statusText = "";
                                
                                switch(moldRisk) {
                                  case 0:
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800">Safe</Badge>;
                                    statusText = "Safe";
                                    break;
                                  case 1:
                                    statusBadge = <Badge className="ml-2 bg-yellow-100 text-yellow-800">Low Risk</Badge>;
                                    statusText = "Low Risk";
                                    break;
                                  case 2:
                                    statusBadge = <Badge className="ml-2 bg-orange-100 text-orange-800">Medium Risk</Badge>;
                                    statusText = "Medium Risk";
                                    break;
                                  case 3:
                                  default:
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800">High Risk</Badge>;
                                    statusText = "High Risk";
                                    break;
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">Mold Risk:</span>
                                      <span>Level {moldRisk} {statusBadge}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                            referenceLines={[
                              {
                                y: 1,
                                label: "Risk Threshold",
                                color: "#FFA500",
                                strokeDasharray: "4 4"
                              }
                            ]}
                            yAxisProps={{
                              allowDecimals: false,
                              domain: [0, 3],
                              ticks: [0, 1, 2, 3],
                              tickFormatter: (value: number) => `Level ${value}`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-xl text-slate-800">Alert History</CardTitle>
                {alerts.filter(a => a.status === 'active').length > 0 && (
                  <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-700">
                    {alerts.filter(a => a.status === 'active').length} active
                  </Badge>
                )}
              </div>
              <CardDescription>Environmental condition alerts for this artwork</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Bell className="h-6 w-6 text-slate-400" />
                  </div>
                  <p>No alerts recorded for this painting</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedAlertGroups.map((group) => {
                    const alert = group.latest;
                    if (!alert) return null;
                    
                    return (
                      <div 
                        key={`${alert.alert_type}-${alert.status === 'dismissed'}`} 
                        className={`flex items-center gap-4 p-4 rounded-lg border ${
                          alert.status === 'active' ? 'bg-amber-50' : 'bg-gray-50'
                        }`}
                      >
                        <div className={`p-2.5 rounded-full ${alert.status === 'dismissed' ? 'bg-gray-200' : 'bg-amber-100'}`}>
                          <Bell className={`h-5 w-5 ${alert.status === 'dismissed' ? 'text-gray-500' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1)} alert
                              </span>
                              <Badge variant="outline" className={`bg-opacity-10 border ${
                                alert.alert_type === 'temperature' ? 'border-orange-200 bg-orange-50 text-orange-700' : 
                                alert.alert_type === 'humidity' ? 'border-blue-200 bg-blue-50 text-blue-700' : 
                                alert.alert_type === 'co2' ? 'border-green-200 bg-green-50 text-green-700' : 
                                'border-yellow-200 bg-yellow-50 text-yellow-700'
                              }`}>
                                {alert.alert_type === 'temperature' ? '°C' : 
                                alert.alert_type === 'humidity' ? '%' : 
                                alert.alert_type === 'co2' ? 'ppm' : 'lux'}
                              </Badge>
                              {group.count > 1 && (
                                <Badge variant="outline" className="ml-2 bg-gray-50 text-slate-600">
                                  +{group.count - 1} more
                                </Badge>
                              )}
                            </div>
                            {alert.status === 'dismissed' && (
                              <Badge variant="outline" className="ml-auto bg-gray-50 text-slate-500">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex flex-col sm:flex-row sm:justify-between">
                            <p className="text-sm text-slate-600">
                              Threshold: <span className="font-medium">{alert.threshold_value}</span> | 
                              Actual: <span className={`font-medium ${alert.status === 'active' ? 'text-amber-700' : ''}`}>
                                {alert.measured_value}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1 sm:mt-0">
                              Latest: {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setDialogOpen(true)}
                      variant="outline"
                      className="flex items-center gap-2 text-slate-600 bg-white hover:bg-gray-50"
                    >
                      <Info className="h-4 w-4" />
                      View all alerts ({alerts.length})
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>All Alerts for {painting.name}</span>
              {alerts.filter(a => a.status === 'active').length > 0 && (
                <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-700">
                  {alerts.filter(a => a.status === 'active').length} active
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              History of all environmental alerts for this painting
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="w-[180px] border-slate-200">
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
              <SortDesc className="h-4 w-4 text-slate-500" />
              <Select value={alertSort} onValueChange={setAlertSort}>
                <SelectTrigger className="w-[180px] border-slate-200">
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
                if (alertFilter === "active") return alert.status === 'active';
                if (alertFilter === "resolved") return alert.status === 'dismissed';
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
                const aRatio = a.measured_value / a.threshold_value;
                const bRatio = b.measured_value / b.threshold_value;
                return bRatio - aRatio;
              })
              .map(alert => (
                <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-lg border ${
                  alert.status === 'active' ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                  <div className={`p-2 rounded-full ${alert.status === 'dismissed' ? 'bg-gray-200' : 'bg-amber-100'}`}>
                    <Bell className={`h-5 w-5 ${alert.status === 'dismissed' ? 'text-gray-500' : 'text-amber-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">
                          {alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1)} alert
                        </span>
                        <Badge variant="outline" className={`bg-opacity-10 border ${
                          alert.alert_type === 'temperature' ? 'border-orange-200 bg-orange-50 text-orange-700' : 
                          alert.alert_type === 'humidity' ? 'border-blue-200 bg-blue-50 text-blue-700' : 
                          alert.alert_type === 'co2' ? 'border-green-200 bg-green-50 text-green-700' : 
                          'border-yellow-200 bg-yellow-50 text-yellow-700'
                        }`}>
                          {alert.alert_type === 'temperature' ? '°C' : 
                          alert.alert_type === 'humidity' ? '%' : 
                          alert.alert_type === 'co2' ? 'ppm' : 'lux'}
                        </Badge>
                      </div>
                      {alert.status === 'dismissed' && (
                        <Badge variant="outline" className="ml-auto bg-gray-50 text-slate-500">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-sm text-slate-600">
                        Threshold: {alert.threshold_value} | Actual: <span className={alert.status === 'active' ? "text-amber-700 font-medium" : ""}>{alert.measured_value}</span>
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                    {alert.status === 'dismissed' && alert.dismissed_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        Resolved at: {format(new Date(alert.dismissed_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-white text-slate-700 hover:bg-gray-50">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 