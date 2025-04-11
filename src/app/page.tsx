'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MeasurementTabs } from "@/components/measurement-tabs";
import DashboardRefresher from "@/components/DashboardRefresher";
import { 
  DropletIcon, 
  ThermometerIcon, 
  Info as InfoIcon, 
  Bell as BellIcon,
  Frame as FrameIcon,
  TabletSmartphone as DevicesIcon,
  Database as DatabaseIcon,
  AlertCircle,
  Wind,
  RefreshCcw,
  Activity,
  BarChart3,
  CheckSquare,
  Cloud,
  Eye,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  ListFilter,
} from "lucide-react";
import { format } from 'date-fns';
import Link from 'next/link';

// Type definitions
type Painting = {
  id: string;
  name: string;
  artist: string;
};

type Device = {
  id: string;
  name: string;
  status: string;
  paintings: Painting;
};

// Types for the environment data
type EnvironmentalData = {
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
  created_at: string;
};

// Types for alerts related to specific environment types
type AlertType = 'temperature' | 'humidity' | 'co2' | 'airpressure' | 'mold_risk_level';

// Define the interface for an alert to include both paintings and painting_id
interface Alert {
  id: string;
  painting_id: string;
  device_id?: string;
  alert_type: string;
  threshold_exceeded: string;
  measured_value: number;
  threshold_value: number;
  status: 'active' | 'dismissed';
  timestamp: string;
  created_at: string;
  updated_at?: string;
  dismissed_at?: string;
  // Legacy fields from the previous system
  temperature?: number | null;
  humidity?: number | null;
  co2concentration?: number | null;
  airpressure?: number | null;
  moldrisklevel?: number | null;
  paintings?: {
    id: string;
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
      };
    }[];
  };
}

// Helper function for formatting relative time
const formatRelativeTime = (date: Date) => {
  // Simple function to format relative time
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

export default function Home() {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dataPoints, setDataPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  // Define the fetch function as a callback to prevent unnecessary re-renders
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch paintings
      const paintingsResponse = await fetch('/api/paintings');
      const paintingsData = await paintingsResponse.json();
      if (!paintingsResponse.ok) throw new Error('Failed to fetch paintings');
      setPaintings(paintingsData.paintings || []);

      // Fetch devices
      const devicesResponse = await fetch('/api/devices');
      const devicesData = await devicesResponse.json();
      if (!devicesResponse.ok) throw new Error('Failed to fetch devices');
      setDevices(devicesData.devices || []);

      // Fetch alerts using the consolidated API endpoint
      // This will both calculate new alerts and return existing ones from the database
      const alertsResponse = await fetch('/api/alerts?status=active&calculateNew=true');
      const alertsData = await alertsResponse.json();
      if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
      setAlerts(alertsData.alerts || []);
      
      console.log(`Fetched ${alertsData.alerts?.length || 0} active alerts for dashboard`);
      if (alertsData.alerts?.length > 0) {
        console.log('Active alerts:', alertsData.alerts.map((a: any) => `${a.alert_type}: ${a.measured_value}`));
      }
      
      // Fetch environmental data for data points count
      const envDataResponse = await fetch('/api/environmental-data');
      const envData = await envDataResponse.json();
      if (!envDataResponse.ok) throw new Error('Failed to fetch environmental data');
      setDataPoints(envData.count || 0);
      
      // Update last refresh time
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up auto-refresh for dashboard data
  useEffect(() => {
    // Initial fetch
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds
    
    // Clean up on component unmount
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);
  
  // Handle manual refresh button click
  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Function to dismiss an alert
  const handleDismissAlert = useCallback(async (alertId: string) => {
    try {
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
        return;
      }

      // Remove the alert from the UI
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  }, []);

  // Helper function to determine alert type and icon
  const getAlertInfo = (alert: any) => {
    if (!alert) return { icon: null, title: 'Unknown Alert', problem: 'No information available', action: 'Contact system administrator' };
    
    const alertType = alert.alert_type?.toLowerCase();
    
    // Debug log the alert to help diagnose issues
    console.log('Processing alert:', alertType, alert);
    
    // Handle CO2 alerts regardless of naming convention
    if (alertType === 'co2' || alertType === 'co2concentration') {
      const isHigh = alert.threshold_exceeded === 'upper';
      
      return {
        icon: <Wind className="h-4 w-4" />,
        title: `CO₂ Level ${isHigh ? 'Too High' : 'Too Low'}`,
        problem: `CO₂ concentration of ${alert.measured_value}ppm ${isHigh ? 'exceeds' : 'is below'} the ${isHigh ? 'maximum' : 'minimum'} threshold of ${alert.threshold_value}ppm.`,
        action: isHigh ? 'Increase ventilation or reduce the number of people in the room.' : 'Check CO₂ sensor calibration if readings are consistently low.'
      };
    }
    
    // Handle other standard alert types
    switch (alertType) {
        case 'temperature':
          return {
          icon: <ThermometerIcon className="h-4 w-4" />,
          title: `Temperature ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`,
          problem: `Temperature of ${alert.measured_value}°C ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'is below'} the safe threshold of ${alert.threshold_value}°C.`,
          action: alert.threshold_exceeded === 'upper' ? 'Lower thermostat setting or improve climate control.' : 'Increase heating in the environment.'
          };
        
        case 'humidity':
          return {
          icon: <DropletIcon className="h-4 w-4" />,
          title: `Humidity ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`,
          problem: `Humidity of ${alert.measured_value}% ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'is below'} the safe threshold of ${alert.threshold_value}%.`,
          action: alert.threshold_exceeded === 'upper' ? 'Use dehumidifier or improve ventilation.' : 'Use humidifier to increase moisture in the air.'
        };
        
      case 'moldrisk':
      case 'moldrisklevel':
        case 'mold_risk_level':
          return {
          icon: <AlertCircle className="h-4 w-4" />,
          title: `Mold Risk Level ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`,
          problem: `Mold risk level of ${alert.measured_value} ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'is below'} the threshold of ${alert.threshold_value}.`,
          action: alert.threshold_exceeded === 'upper' ? 'Urgently reduce humidity and increase ventilation.' : 'Monitor environmental conditions.'
          };
          
        case 'airpressure':
        case 'air_pressure':
          return {
          icon: <Cloud className="h-4 w-4" />,
          title: `Air Pressure ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`,
          problem: `Air pressure of ${alert.measured_value} hPa ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'is below'} the threshold of ${alert.threshold_value} hPa.`,
          action: alert.threshold_exceeded === 'upper' ? 'Check building pressure controls.' : 'Monitor environmental conditions.'
          };
          
        default:
        console.log(`Unknown alert type: ${alertType}`, alert);
          return {
          icon: <AlertCircle className="h-4 w-4" />,
          title: `Environmental Alert`,
          problem: `Environmental condition (${alertType || 'unknown'}) outside safe thresholds.`,
          action: 'Check environmental control systems.'
        };
    }
  };

  // Helper function to format relative time
  const getRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return `${format(date, 'MMM d, yyyy')} at ${format(date, 'h:mm a')}`;
    } catch (err) {
      return 'recently';
    }
  };

  // Calculate active devices - those with recent measurements
  const activeDevices = devices.filter(device => 
    device.status === 'active' || device.status === 'connected'
  ).length;

  // Function to deduplicate alerts, keeping only the latest one for each unique combination
  // of painting_id, alert_type, and threshold_exceeded
  const getDeduplicatedAlerts = (alerts: Alert[]): Alert[] => {
    // Create a map to store the latest alert for each unique combination
    const alertMap = new Map<string, Alert>();
    
    // Sort alerts by timestamp in descending order (newest first)
    const sortedAlerts = [...alerts].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Process alerts and keep only the latest one for each unique combination
    sortedAlerts.forEach(alert => {
      // Create a unique key based on painting_id, alert_type, and threshold_exceeded
      const key = `${alert.painting_id}-${alert.alert_type}-${alert.threshold_exceeded}`;
      
      // Only add to the map if this combination doesn't exist yet (since we're already sorted by time)
      if (!alertMap.has(key)) {
        alertMap.set(key, alert);
      }
    });
    
    // Return the deduplicated alerts as an array
    return Array.from(alertMap.values());
  };

  // Fix the alert type matching to ensure CO2 alerts display properly
  const getAlertTitle = (alert: any) => {
    const alertType = alert.alert_type?.toLowerCase();
    
    // Handle CO2 alerts - check both formats
    if (alertType === 'co2' || alertType === 'co2concentration') {
      return `CO₂ Level ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
    }
    
    // Handle other alert types
    switch (alertType) {
      case 'temperature':
        return `Temperature ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
      case 'humidity':
        return `Humidity ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
      case 'moldrisk':
      case 'moldrisklevel':
        return `Mold Risk Level ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
      case 'airpressure':
        return `Air Pressure ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
      default:
        return `Alert: ${alertType || 'Unknown'} ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
    }
  };

  // Get deduplicated alerts for display
  const deduplicatedAlerts = getDeduplicatedAlerts(alerts);

  return (
    <div className="flex flex-col gap-6">
      {/* Add the DashboardRefresher to listen for data updates */}
      <DashboardRefresher onDataUpdate={fetchDashboardData} />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(lastRefresh), 'HH:mm:ss')}
          </div>
          <button 
            onClick={handleRefresh}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
            aria-label="Refresh data"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-l-2 border-l-blue-400">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Paintings</CardTitle>
              <FrameIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? '...' : paintings.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monitored artworks</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-2 border-l-green-400">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <DevicesIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? '...' : activeDevices}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? '...' : `${devices.length} total devices`}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-2 border-l-amber-400">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <BellIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {loading ? '...' : deduplicatedAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {deduplicatedAlerts.length > 0 ? 'Require attention' : 'No active alerts'}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-2 border-l-purple-400">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? '...' : dataPoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total measurements</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight">Active Alerts</h2>
            {deduplicatedAlerts.length > 0 && (
            <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 text-xs font-medium rounded-full h-5 px-2">
                {deduplicatedAlerts.length}
            </span>
          )}
          </div>
          
          <Link 
            href="/alert-history" 
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
              <line x1="16" x2="16" y1="2" y2="6"></line>
              <line x1="8" x2="8" y1="2" y2="6"></line>
              <line x1="3" x2="21" y1="10" y2="10"></line>
            </svg>
            View Alert History
          </Link>
        </div>
        
        {loading ? (
          <Card className="p-6 text-center text-muted-foreground">
            Loading alerts...
          </Card>
        ) : deduplicatedAlerts.length > 0 ? (
          <div className="grid gap-4">
            {deduplicatedAlerts.map((alert, index) => {
              const alertInfo = getAlertInfo(alert);
              return (
                <Alert key={alert.id || index} variant="warning" className="shadow-sm border-l-2 border-l-amber-400 relative">
                  {/* Add dismiss button */}
                  <button 
                    onClick={() => handleDismissAlert(alert.id)}
                    className="absolute top-3 right-3 text-amber-500 hover:text-amber-700 transition-colors"
                    aria-label="Dismiss alert"
                    title="Dismiss alert"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m15 9-6 6" />
                      <path d="m9 9 6 6" />
                    </svg>
                  </button>
                  
                  {alertInfo.icon}
                  <AlertTitle className="font-semibold">{alertInfo.title}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p><strong>Painting:</strong> {alert.paintings?.name 
                        ? `${alert.paintings.name} by ${alert.paintings.artist || 'Unknown Artist'}` 
                        : `ID: ${alert.painting_id || 'Unknown'}`}</p>
                      <p><strong>Problem:</strong> {alertInfo.problem}</p>
                      <p><strong>Action:</strong> {alertInfo.action}</p>
                      <p className="text-xs text-muted-foreground">
                        Last updated {alert.timestamp ? formatRelativeTime(new Date(alert.timestamp)) : 'recently'}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No active alerts at this time</p>
          </Card>
        )}
      </section>
      
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold tracking-tight">Recent Measurements</h2>
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <MeasurementTabs />
      </section>
    </div>
  );
}