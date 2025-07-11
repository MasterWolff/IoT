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
import { AlertTriangle, Bell, X, Filter, SortDesc, Info, Calendar, User, Thermometer, Droplets, Wind, Bug, SunMedium, Gauge, Download } from "lucide-react";
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
  const [downloadFormat, setDownloadFormat] = useState<string>("json");
  const [isDownloading, setIsDownloading] = useState(false);
  const [recentlyDismissed, setRecentlyDismissed] = useState<string[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);

  useEffect(() => {
    async function fetchPaintingDetails() {
      try {
        const data = await getPaintingById(paintingId);
        if (!data) {
          throw new Error('Painting not found');
        }
        
        // Log information about the environmental data
        if (data.environmental_data && data.environmental_data.length > 0) {
          console.log(`Received ${data.environmental_data.length} environmental data points`);
          
          // Sort to find the earliest and latest timestamps
          const sortedData = [...data.environmental_data].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const earliestTime = new Date(sortedData[0].created_at);
          const latestTime = new Date(sortedData[sortedData.length - 1].created_at);
          
          console.log(`Data timestamp range: ${earliestTime.toISOString()} to ${latestTime.toISOString()}`);
        } else {
          console.log('No environmental data received');
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
    Temperature: data.temperature !== null ? Number(data.temperature) : null,
    Humidity: data.humidity !== null ? Number(data.humidity) : null,
    CO2: data.co2concentration !== null ? Number(data.co2concentration) : null,
    'Air Pressure': data.airpressure !== null ? Number(data.airpressure) : null,
    'Mold Risk': data.moldrisklevel !== null ? Number(data.moldrisklevel) : null,
    Illumination: data.illuminance !== null ? Number(data.illuminance) : null
  })).sort((a, b) => {
    // Sort by time to ensure proper line chart display (oldest to newest)
    return a.rawTime.getTime() - b.rawTime.getTime();
  }) || [];

  // Apply date filter to chart data - ensure we always include the most recent data point for each measurement type
  const getFilteredChartData = () => {
    // Always ensure we have the latest measurements regardless of date filter
    const latestPoints = {
      Temperature: null as any,
      Humidity: null as any,
      CO2: null as any,
      'Air Pressure': null as any,
      'Mold Risk': null as any,
      Illumination: null as any
    };
    
    // Find the latest data point for each measurement type
    chartData.forEach(point => {
      Object.keys(latestPoints).forEach(key => {
        const typedKey = key as keyof typeof latestPoints;
        if (point[typedKey] !== null) {
          if (!latestPoints[typedKey] || new Date(point.rawTime) > new Date(latestPoints[typedKey].rawTime)) {
            latestPoints[typedKey] = point;
          }
        }
      });
    });
    
    // Filter based on date
    let filtered = chartData;
    if (dateFilter !== "all") {
      const today = startOfDay(new Date());
      const filterDate = dateFilter === "today" 
        ? today 
        : subDays(today, 7); // "week"
      
      filtered = chartData.filter(data => isAfter(data.rawTime, filterDate));
    }
    
    // Ensure the latest points for each type are included
    Object.values(latestPoints).forEach(point => {
      if (point) {
        // Check if this latest point is already in the filtered data
        const pointExists = filtered.some(p => 
          p.rawTime.getTime() === point.rawTime.getTime()
        );
        
        // If not, add it
        if (!pointExists) {
          filtered.push(point);
        }
      }
    });
    
    // Re-sort the combined data
    return filtered.sort((a, b) => a.rawTime.getTime() - b.rawTime.getTime());
  };
  
  const filteredChartData = getFilteredChartData();
  
  // Process metrics, ensuring we don't include null values
  const metrics = {
    temperature: filteredChartData
      .filter(d => d.Temperature !== null)
      .map(d => d.Temperature),
    humidity: filteredChartData
      .filter(d => d.Humidity !== null)
      .map(d => d.Humidity),
    co2: filteredChartData
      .filter(d => d.CO2 !== null)
      .map(d => d.CO2),
    light: filteredChartData
      .filter(d => d.Illumination !== null)
      .map(d => d.Illumination),
    airpressure: filteredChartData
      .filter(d => d['Air Pressure'] !== null)
      .map(d => d['Air Pressure']),
    moldRisk: filteredChartData
      .filter(d => d['Mold Risk'] !== null)
      .map(d => d['Mold Risk'])
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

  // Function to dismiss an alert
  const handleDismissAlert = async (alertId: string) => {
    try {
      // Save the alert ID in a "recently dismissed" array to prevent it from reappearing
      // due to the polling interval (race condition)
      setRecentlyDismissed(prev => [...prev, alertId]);
      
      // Update the alert status in the database
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: alertId,
          status: 'dismissed'
        }),
      });

      if (!response.ok) {
        console.error('Failed to dismiss alert:', await response.text());
        setRecentlyDismissed(prev => prev.filter(id => id !== alertId)); // Remove from recently dismissed if failed
        return;
      }

      // Update the alert in the UI - instead of filtering it out, mark it as dismissed
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'dismissed', dismissed_at: new Date().toISOString() } 
            : alert
        )
      );
      
      console.log(`Successfully dismissed alert: ${alertId}`);
      
      // Remove the alert ID from the "recently dismissed" list after 2 minutes
      setTimeout(() => {
        setRecentlyDismissed(prev => prev.filter(id => id !== alertId));
      }, 120000); // 2 minutes
    } catch (err) {
      console.error('Error dismissing alert:', err);
      setRecentlyDismissed(prev => prev.filter(id => id !== alertId)); // Remove from recently dismissed if failed
    }
  };
  
  // Function to show alert details
  const showAlertDetails = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowAlertDialog(true);
  };
  
  // Function to close alert details dialog
  const closeAlertDialog = () => {
    setShowAlertDialog(false);
    setSelectedAlert(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-3 sm:py-6 sm:px-4 lg:px-8">
      {/* Hero Section */}
      <div className="bg-white border rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Image Column */}
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-lg overflow-hidden">
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
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{painting.name}</h1>
                  <div className="flex items-center mt-2">
                    <User className="h-4 w-4 text-slate-500 mr-2" />
                    <p className="text-base sm:text-lg text-slate-700">{painting.artist}</p>
                  </div>
                  <div className="flex items-center mt-2">
                    <Calendar className="h-4 w-4 text-slate-500 mr-2" />
                    <Badge variant="outline" className="text-sm">
                      {painting.creation_date ? format(new Date(painting.creation_date), 'yyyy') : 'Date unknown'}
                    </Badge>
                  </div>
                </div>
                
                {alerts.filter(a => a.status === 'active').length > 0 && (
                  <Badge variant="outline" className="text-md border-amber-300 bg-amber-50 text-amber-700 flex items-center gap-1 mt-2 sm:mt-0">
                    <AlertTriangle className="h-4 w-4" />
                    {alerts.filter(a => a.status === 'active').length} active alerts
                  </Badge>
                  )}
                </div>
              
              {/* Materials Section */}
              <div className="mt-4 sm:mt-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2 sm:mb-3">Materials</h2>
                <div className="flex flex-wrap gap-2">
                  {painting.painting_materials.map((pm) => (
                    <Badge key={pm.material_id} variant="outline" className="text-sm py-1 px-3 bg-gray-50">
                      {pm.materials.name}
                    </Badge>
                  ))}
                </div>
                {painting.painting_materials.some(pm => pm.materials.description) && (
                  <div className="mt-3 sm:mt-4 space-y-2">
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
              <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-5">
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border">
                  <div className="flex items-center">
                    <Thermometer className="h-4 sm:h-5 w-4 sm:w-5 text-orange-600 mr-1 sm:mr-2 opacity-70 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-600 truncate">Temperature</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-xl sm:text-2xl font-semibold text-slate-800">{latestData.temperature?.toFixed(1) || '—'}°C</span>
                    {alertCounts['temperature'] > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap">
                        {alertCounts['temperature']} alert{alertCounts['temperature'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border">
                  <div className="flex items-center">
                    <Droplets className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600 mr-1 sm:mr-2 opacity-70 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-600 truncate">Humidity</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-xl sm:text-2xl font-semibold text-slate-800">{latestData.humidity?.toFixed(1) || '—'}%</span>
                    {alertCounts['humidity'] > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap">
                        {alertCounts['humidity']} alert{alertCounts['humidity'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border">
                  <div className="flex items-center">
                    <Wind className="h-4 sm:h-5 w-4 sm:w-5 text-green-600 mr-1 sm:mr-2 opacity-70 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-600 truncate">CO₂</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-xl sm:text-2xl font-semibold text-slate-800">{latestData.co2concentration?.toFixed(0) || '—'} ppm</span>
                    {alertCounts['co2'] > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap">
                        {alertCounts['co2']} alert{alertCounts['co2'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border">
                  <div className="flex items-center">
                    <SunMedium className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-600 mr-1 sm:mr-2 opacity-70 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-600 truncate">Light</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-xl sm:text-2xl font-semibold text-slate-800">{latestData.illuminance?.toFixed(0) || '—'} lux</span>
                    {alertCounts['light'] > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap">
                        {alertCounts['light']} alert{alertCounts['light'] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border">
                  <div className="flex items-center">
                    <Bug className="h-4 sm:h-5 w-4 sm:w-5 text-amber-600 mr-1 sm:mr-2 opacity-70 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-600 truncate">Mold Risk</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-xl sm:text-2xl font-semibold text-slate-800">{latestData.moldrisklevel?.toFixed(1) || '—'}</span>
                    {alertCounts['moldrisklevel'] > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap">
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
      <Tabs defaultValue="environment" className="mb-6 sm:mb-8">
        <TabsList className="mb-4 w-full max-w-full overflow-x-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger value="environment" className="flex-1 min-w-fit">Environment Data</TabsTrigger>
          <TabsTrigger value="alerts" className="flex-1 min-w-fit relative">
            <span>Alerts</span>
            {alerts.filter(a => a.status === 'active').length > 0 && 
            <span className="ml-1 px-1.5 py-0.5 inline-flex rounded-full text-xs bg-amber-100 text-amber-800 whitespace-nowrap">
              {alerts.filter(a => a.status === 'active').length}
            </span>}
          </TabsTrigger>
        </TabsList>
        
        {/* Environment Data Tab */}
        <TabsContent value="environment">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-white pb-3 sm:pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl text-slate-800">Environmental Monitoring</CardTitle>
                  <CardDescription className="mt-1 text-sm">Historical environmental data for this artwork</CardDescription>
                  
                  {/* Download Data Button Section */}
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">Download complete environmental data records:</p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={downloadFormat}
                        onValueChange={(value) => setDownloadFormat(value)}
                      >
                        <SelectTrigger className="h-8 w-[90px]">
                          <SelectValue placeholder="Format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsDownloading(true);
                          window.location.href = `/api/environmental-data/download?paintingId=${paintingId}&format=${downloadFormat}`;
                          setTimeout(() => setIsDownloading(false), 2000);
                        }}
                        disabled={isDownloading}
                        className="h-8"
                      >
                        {isDownloading ? (
                          <>
                            <span className="animate-pulse mr-1">Downloading</span>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download Data
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-3">
                  {filteredChartData.length > 0 && (
                    <div className="text-xs sm:text-sm font-medium text-slate-600">
                      <span>{filteredChartData.length} measurements</span>
                      <span className="ml-2">{getTimeRangeDisplay()}</span>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Button 
                      variant={dateFilter === "today" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDateFilter("today")}
                      className={`text-xs h-7 px-2 sm:px-3 ${dateFilter !== "today" ? "bg-white text-slate-700 hover:bg-gray-50" : ""}`}
                    >
                      Today
                    </Button>
                    <Button 
                      variant={dateFilter === "week" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDateFilter("week")}
                      className={`text-xs h-7 px-2 sm:px-3 ${dateFilter !== "week" ? "bg-white text-slate-700 hover:bg-gray-50" : ""}`}
                    >
                      Past 7d
                    </Button>
                    <Button 
                      variant={dateFilter === "all" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setDateFilter("all")}
                      className={`text-xs h-7 px-2 sm:px-3 ${dateFilter !== "all" ? "bg-white text-slate-700 hover:bg-gray-50" : ""}`}
                    >
                      All time
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-white border-b py-2 sm:py-3 px-3 sm:px-4">
                <Tabs defaultValue="temperature" className="space-y-3 sm:space-y-4">
                  <div className="overflow-x-auto pb-2 scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    <style jsx global>{`
                      .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    <TabsList className="bg-gray-50 p-1 rounded-full w-fit min-w-full">
                      <TabsTrigger value="temperature" className="rounded-full px-2 sm:px-4 py-1 sm:py-1.5 data-[state=active]:bg-white flex items-center gap-1 text-xs sm:text-sm">
                        <Thermometer className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Temperature</span>
                      </TabsTrigger>
                      <TabsTrigger value="humidity" className="rounded-full px-2 sm:px-4 py-1 sm:py-1.5 data-[state=active]:bg-white flex items-center gap-1 text-xs sm:text-sm">
                        <Droplets className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Humidity</span>
                      </TabsTrigger>
                      <TabsTrigger value="co2" className="rounded-full px-2 sm:px-4 py-1 sm:py-1.5 data-[state=active]:bg-white flex items-center gap-1 text-xs sm:text-sm">
                        <Wind className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">CO₂</span>
                      </TabsTrigger>
                      <TabsTrigger value="light" className="rounded-full px-2 sm:px-4 py-1 sm:py-1.5 data-[state=active]:bg-white flex items-center gap-1 text-xs sm:text-sm">
                        <SunMedium className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Light</span>
                      </TabsTrigger>
                      <TabsTrigger value="airpressure" className="rounded-full px-2 sm:px-4 py-1 sm:py-1.5 data-[state=active]:bg-white flex items-center gap-1 text-xs sm:text-sm">
                        <Gauge className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Air Pressure</span>
                      </TabsTrigger>
                      <TabsTrigger value="moldRisk" className="rounded-full px-2 sm:px-4 py-1 sm:py-1.5 data-[state=active]:bg-white flex items-center gap-1 text-xs sm:text-sm">
                        <Bug className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Mold Risk</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="temperature" className="p-2 sm:p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
                        {chartData.length > 0 ? "No data for selected time period" : "No temperature data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Thermometer className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                          <h3 className="text-base sm:text-lg font-medium text-slate-800">Temperature Over Time</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">Measured in °C</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('Temperature') && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {getThresholds('Temperature')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                Min: {getThresholds('Temperature')?.lower}°C
                              </Badge>
                            )}
                            {getThresholds('Temperature')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                Max: {getThresholds('Temperature')?.upper}°C
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[300px] sm:h-[400px] mt-2 sm:mt-4 -mx-2 sm:mx-0">
                          <LineChart
                            data={filteredChartData.filter(d => d.Temperature !== null)}
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
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && temperature > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800 text-xs">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800 text-xs">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">Temperature:</span>
                                      <span className="text-sm">{temperature.toFixed(1)}°C {statusBadge}</span>
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

                  <TabsContent value="humidity" className="p-2 sm:p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
                        {chartData.length > 0 ? "No data for selected time period" : "No humidity data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                          <h3 className="text-base sm:text-lg font-medium text-slate-800">Humidity Over Time</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">Measured in %</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('Humidity') && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {getThresholds('Humidity')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                Min: {getThresholds('Humidity')?.lower}%
                              </Badge>
                            )}
                            {getThresholds('Humidity')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                Max: {getThresholds('Humidity')?.upper}%
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[300px] sm:h-[400px] mt-2 sm:mt-4 -mx-2 sm:mx-0">
                          <LineChart
                            data={filteredChartData.filter(d => d.Humidity !== null)}
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
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && humidity > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800 text-xs">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800 text-xs">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">Humidity:</span>
                                      <span className="text-sm">{humidity.toFixed(1)}% {statusBadge}</span>
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

                  <TabsContent value="co2" className="p-2 sm:p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
                        {chartData.length > 0 ? "No data for selected time period" : "No CO₂ data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Wind className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          <h3 className="text-base sm:text-lg font-medium text-slate-800">CO₂ Levels Over Time</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">Measured in ppm</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('CO2') && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {getThresholds('CO2')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                Min: {getThresholds('CO2')?.lower} ppm
                              </Badge>
                            )}
                            {getThresholds('CO2')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                Max: {getThresholds('CO2')?.upper} ppm
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[300px] sm:h-[400px] mt-2 sm:mt-4 -mx-2 sm:mx-0">
                          <LineChart
                            data={filteredChartData.filter(d => d.CO2 !== null)}
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
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && co2 > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800 text-xs">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800 text-xs">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">CO₂:</span>
                                      <span className="text-sm">{co2.toFixed(0)} ppm {statusBadge}</span>
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

                  <TabsContent value="light" className="p-2 sm:p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
                        {chartData.length > 0 ? "No data for selected time period" : "No light data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <SunMedium className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                          <h3 className="text-base sm:text-lg font-medium text-slate-800">Light Levels Over Time</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">Measured in lux</p>
                        
                        {/* Add threshold badges if available */}
                        {getThresholds('Illumination') && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {getThresholds('Illumination')?.lower !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                Min: {getThresholds('Illumination')?.lower} lux
                              </Badge>
                            )}
                            {getThresholds('Illumination')?.upper !== null && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                Max: {getThresholds('Illumination')?.upper} lux
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="h-[300px] sm:h-[400px] mt-2 sm:mt-4 -mx-2 sm:mx-0">
                          <LineChart
                            data={filteredChartData.filter(d => d.Illumination !== null)}
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
                                    statusBadge = <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Too Low</Badge>;
                                  } else if (thresholds.upper !== null && illumination > thresholds.upper) {
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800 text-xs">Too High</Badge>;
                                  } else {
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800 text-xs">OK</Badge>;
                                  }
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">Illumination:</span>
                                      <span className="text-sm">{illumination.toFixed(1)} lux {statusBadge}</span>
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
                  
                  <TabsContent value="airpressure" className="p-2 sm:p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
                        {chartData.length > 0 ? "No data for selected time period" : "No air pressure data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                          <h3 className="text-base sm:text-lg font-medium text-slate-800">Air Pressure Over Time</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">Measured in hPa</p>
                        <div className="h-[300px] sm:h-[400px] mt-2 sm:mt-4 -mx-2 sm:mx-0">
                          <LineChart
                            data={filteredChartData.filter(d => d['Air Pressure'] !== null)}
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
                  
                  <TabsContent value="moldRisk" className="p-2 sm:p-4 m-0">
                    {filteredChartData.length === 0 ? (
                      <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
                        {chartData.length > 0 ? "No data for selected time period" : "No mold risk data available"}
                      </div>
                    ) : (
                      <div className="w-full border-0 p-0 bg-white">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Bug className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                          <h3 className="text-base sm:text-lg font-medium text-slate-800">Mold Risk Level Over Time</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">Risk index</p>
                        
                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            Level 0: Safe
                          </Badge>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                            Level 1: Low Risk
                          </Badge>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            Level 2: Medium Risk
                          </Badge>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                            Level 3: High Risk
                          </Badge>
                        </div>
                        
                        <div className="h-[300px] sm:h-[400px] mt-2 sm:mt-4 -mx-2 sm:mx-0">
                          <LineChart
                            data={filteredChartData.filter(d => d['Mold Risk'] !== null)}
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
                                    statusBadge = <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Safe</Badge>;
                                    statusText = "Safe";
                                    break;
                                  case 1:
                                    statusBadge = <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs">Low Risk</Badge>;
                                    statusText = "Low Risk";
                                    break;
                                  case 2:
                                    statusBadge = <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">Medium Risk</Badge>;
                                    statusText = "Medium Risk";
                                    break;
                                  case 3:
                                  default:
                                    statusBadge = <Badge className="ml-2 bg-red-100 text-red-800 text-xs">High Risk</Badge>;
                                    statusText = "High Risk";
                                    break;
                                }
                                
                                return (
                                  <div className="bg-white p-2 border rounded shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">Mold Risk:</span>
                                      <span className="text-sm">Level {moldRisk} {statusBadge}</span>
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
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                <CardTitle className="text-lg sm:text-xl text-slate-800">Alert History</CardTitle>
                {alerts.filter(a => a.status === 'active').length > 0 && (
                  <Badge variant="outline" className="ml-1 sm:ml-2 border-amber-200 bg-amber-50 text-amber-700 text-xs">
                    {alerts.filter(a => a.status === 'active').length} active
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">Environmental condition alerts for this artwork</CardDescription>
        </CardHeader>
            <CardContent className="p-3 sm:p-6">
          {alerts.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-slate-500">
                  <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                  </div>
                  <p className="text-sm sm:text-base">No alerts recorded for this painting</p>
            </div>
          ) : (
                <div className="space-y-3 sm:space-y-4">
              {displayedAlertGroups.map((group) => {
                const alert = group.latest;
                if (!alert) return null;
                
                return (
                  <div 
                    key={`${alert.alert_type}-${alert.status === 'dismissed'}`} 
                    className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border ${
                      alert.status === 'active' ? 'bg-amber-50' : 'bg-gray-50'
                    } cursor-pointer hover:border-amber-300 transition-colors`}
                    onClick={() => showAlertDetails(alert)}
                  >
                    <div className={`p-2 sm:p-2.5 rounded-full ${alert.status === 'dismissed' ? 'bg-gray-200' : 'bg-amber-100'}`}>
                      <Bell className={`h-4 w-4 sm:h-5 sm:w-5 ${alert.status === 'dismissed' ? 'text-gray-500' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="font-medium text-slate-700 text-sm sm:text-base">
                            {alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1)} alert
                          </span>
                          <Badge variant="outline" className={`bg-opacity-10 border text-xs ${
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
                            <Badge variant="outline" className="bg-gray-50 text-slate-600 text-xs">
                              +{group.count - 1} more
                            </Badge>
                          )}
                        </div>
                        {alert.status === 'active' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissAlert(alert.id);
                            }}
                            className="h-7 w-7 p-0 rounded-full hover:bg-amber-100"
                          >
                            <X className="h-4 w-4 text-amber-700" />
                          </Button>
                        )}
                        {alert.status === 'dismissed' && (
                          <Badge variant="outline" className="bg-gray-50 text-slate-500 text-xs">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:justify-between">
                        <p className="text-xs sm:text-sm text-slate-600">
                          Threshold: <span className="font-medium">{alert.threshold_value}</span> | 
                          Actual: <span className={`font-medium ${alert.status === 'active' ? 'text-amber-700' : ''}`}>
                            {alert.measured_value}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 sm:mt-0">
                          Latest: {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
                  <div className="flex justify-center mt-4 sm:mt-6">
                    <Button 
                      onClick={() => setDialogOpen(true)}
                      variant="outline"
                      className="flex items-center gap-1 sm:gap-2 text-slate-600 bg-white hover:bg-gray-50 text-xs sm:text-sm h-8 sm:h-9"
                    >
                      <Info className="h-3 w-3 sm:h-4 sm:w-4" />
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              <span>All Alerts for {painting.name}</span>
              {alerts.filter(a => a.status === 'active').length > 0 && (
                <Badge variant="outline" className="ml-1 sm:ml-2 border-amber-200 bg-amber-50 text-amber-700 text-xs">
                  {alerts.filter(a => a.status === 'active').length} active
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              History of all environmental alerts for this painting
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="w-full sm:w-[180px] border-slate-200 h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">All types</SelectItem>
                  <SelectItem value="temperature" className="text-xs sm:text-sm">Temperature</SelectItem>
                  <SelectItem value="humidity" className="text-xs sm:text-sm">Humidity</SelectItem>
                  <SelectItem value="co2" className="text-xs sm:text-sm">CO2</SelectItem>
                  <SelectItem value="light" className="text-xs sm:text-sm">Light</SelectItem>
                  <SelectItem value="active" className="text-xs sm:text-sm">Active only</SelectItem>
                  <SelectItem value="resolved" className="text-xs sm:text-sm">Resolved only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <SortDesc className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
              <Select value={alertSort} onValueChange={setAlertSort}>
                <SelectTrigger className="w-full sm:w-[180px] border-slate-200 h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest" className="text-xs sm:text-sm">Latest first</SelectItem>
                  <SelectItem value="oldest" className="text-xs sm:text-sm">Oldest first</SelectItem>
                  <SelectItem value="severity" className="text-xs sm:text-sm">Severity (highest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-4 my-3 sm:my-4 max-h-[60vh] overflow-y-auto pr-1">
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
                <div 
                  key={alert.id} 
                  className={`flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-lg border ${
                    alert.status === 'active' ? 'bg-amber-50' : 'bg-gray-50'
                  } cursor-pointer hover:border-amber-300 transition-colors`}
                  onClick={() => showAlertDetails(alert)}
                >
                  <div className={`p-1.5 sm:p-2 rounded-full ${alert.status === 'dismissed' ? 'bg-gray-200' : 'bg-amber-100'}`}>
                    <Bell className={`h-3 w-3 sm:h-5 sm:w-5 ${alert.status === 'dismissed' ? 'text-gray-500' : 'text-amber-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="font-medium text-slate-700 text-xs sm:text-sm">
                          {alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1)} alert
                        </span>
                        <Badge variant="outline" className={`bg-opacity-10 border text-xs ${
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
                      {alert.status === 'active' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissAlert(alert.id);
                          }}
                          className="h-7 w-7 p-0 rounded-full hover:bg-amber-100"
                        >
                          <X className="h-4 w-4 text-amber-700" />
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-slate-500 text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between mt-1 sm:mt-2">
                      <p className="text-xs sm:text-sm text-slate-600">
                        Threshold: {alert.threshold_value} | Actual: <span className={alert.status === 'active' ? "text-amber-700 font-medium" : ""}>{alert.measured_value}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 sm:mt-0">
                        {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                    {alert.status === 'dismissed' && alert.dismissed_at && (
                      <p className="text-xs text-slate-500 mt-0.5 sm:mt-1">
                        Resolved at: {format(new Date(alert.dismissed_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-xs sm:text-sm h-8 sm:h-9 px-3 py-1">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Details Dialog */}
      {showAlertDialog && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Alert Details</h3>
                <button 
                  onClick={closeAlertDialog}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${selectedAlert.status === 'dismissed' ? 'bg-gray-200' : 'bg-amber-100'}`}>
                    <Bell className={`h-5 w-5 ${selectedAlert.status === 'dismissed' ? 'text-gray-500' : 'text-amber-600'}`} />
                  </div>
                  <span className="font-semibold text-lg">
                    {selectedAlert.alert_type.charAt(0).toUpperCase() + selectedAlert.alert_type.slice(1)} Alert
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p><strong>Painting:</strong> {painting?.name} by {painting?.artist || 'Unknown Artist'}</p>
                  <p>
                    <strong>Problem:</strong> {selectedAlert.alert_type.charAt(0).toUpperCase() + selectedAlert.alert_type.slice(1)} 
                    {' '}of {selectedAlert.measured_value}{selectedAlert.alert_type === 'temperature' ? '°C' : 
                    selectedAlert.alert_type === 'humidity' ? '%' : 
                    selectedAlert.alert_type === 'co2' ? ' ppm' : ' lux'} exceeds the 
                    {selectedAlert.threshold_exceeded === 'upper' ? ' upper' : ' lower'} threshold 
                    of {selectedAlert.threshold_value}{selectedAlert.alert_type === 'temperature' ? '°C' : 
                    selectedAlert.alert_type === 'humidity' ? '%' : 
                    selectedAlert.alert_type === 'co2' ? ' ppm' : ' lux'}
                  </p>
                  <p><strong>Action:</strong> Adjust {selectedAlert.alert_type} in the environment</p>
                  <p className="text-sm text-muted-foreground">
                    Recorded at {format(new Date(selectedAlert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                  {selectedAlert.status === 'dismissed' && selectedAlert.dismissed_at && (
                    <p className="text-sm text-muted-foreground">
                      Resolved at {format(new Date(selectedAlert.dismissed_at), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={closeAlertDialog}
                    className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                  >
                    Close
                  </Button>
                  {selectedAlert.status === 'active' && (
                    <Button
                      variant="default"
                      onClick={() => {
                        handleDismissAlert(selectedAlert.id);
                        closeAlertDialog();
                      }}
                      className="bg-amber-500 text-white hover:bg-amber-600"
                    >
                      Dismiss Alert
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 