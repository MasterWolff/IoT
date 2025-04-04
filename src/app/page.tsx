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
  InfoIcon, 
  BellIcon,
  FrameIcon,
  TabletSmartphone as DevicesIcon,
  DatabaseIcon,
  AlertCircle,
  Wind,
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
  created_at: string;
};

// Types for alerts related to specific environment types
type AlertType = 'temperature' | 'humidity' | 'co2' | 'airpressure' | 'mold_risk_level';

type Alert = {
  id: string;
  timestamp: string;
  temperature?: number | null;
  humidity?: number | null;
  co2concentration?: number | null;
  airpressure?: number | null;
  moldrisklevel?: number | null;
  paintings: {
    id: string;
    name: string;
    artist: string;
    painting_materials: {
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
      }
    }[];
  };
  alert_type?: string;
  threshold_exceeded?: string;
  measured_value?: number;
  threshold_value?: number;
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
      const alertsResponse = await fetch('/api/alerts?status=active');
      const alertsData = await alertsResponse.json();
      if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
      setAlerts(alertsData.alerts || []);
      
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

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
  const getAlertInfo = (alert: Alert) => {
    // Use alert_type field if present in new alert structure
    if (alert.alert_type) {
      switch (alert.alert_type) {
        case 'temperature':
          return {
            type: 'temperature',
            icon: <ThermometerIcon />,
            title: `Temperature ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'} (${alert.measured_value}°C)`,
            problem: `Temperature ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value}°C`,
            action: alert.threshold_exceeded === 'upper' ? 'Lower thermostat setting' : 'Increase heating',
          };
        
        case 'humidity':
          return {
            type: 'humidity',
            icon: <DropletIcon />,
            title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} Humidity (${alert.measured_value}%)`,
            problem: `Humidity ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value}%`,
            action: alert.threshold_exceeded === 'upper' ? 'Adjust dehumidifier settings' : 'Increase humidity',
          };
          
        case 'co2':
          return {
            type: 'co2',
            icon: <Wind />,
            title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} CO2 Level (${alert.measured_value} ppm)`,
            problem: `CO2 level ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value} ppm`,
            action: alert.threshold_exceeded === 'upper' ? 'Improve ventilation' : 'Check CO2 sensor calibration',
          };
          
        case 'mold_risk_level':
          return {
            type: 'mold',
            icon: <AlertCircle />,
            title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} Mold Risk (Level ${alert.measured_value})`,
            problem: `Mold risk level ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value}`,
            action: alert.threshold_exceeded === 'upper' ? 'Adjust humidity and temperature' : 'Check sensor calibration',
          };
          
        case 'airpressure':
          return {
            type: 'pressure',
            icon: <AlertCircle />,
            title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} Air Pressure (${alert.measured_value} hPa)`,
            problem: `Air pressure ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value} hPa`,
            action: alert.threshold_exceeded === 'upper' ? 'Check ventilation' : 'Monitor conditions',
          };
          
        // Added fallbacks for every possible variant of field names
        case 'air_pressure':
        case 'air pressure':
          return {
            type: 'pressure',
            icon: <AlertCircle />,
            title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} Air Pressure (${alert.measured_value} hPa)`,
            problem: `Air pressure ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value} hPa`,
            action: alert.threshold_exceeded === 'upper' ? 'Check ventilation' : 'Monitor conditions',
          };
          
        case 'moldrisklevel':
        case 'moldrisk':
          return {
            type: 'mold',
            icon: <AlertCircle />,
            title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} Mold Risk (Level ${alert.measured_value})`,
            problem: `Mold risk level ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value}`,
            action: alert.threshold_exceeded === 'upper' ? 'Adjust humidity and temperature' : 'Check sensor calibration',
          };
          
        default:
          console.log(`Unknown alert type: ${alert.alert_type}`, alert);
          return {
            type: 'unknown',
            icon: <AlertCircle />,
            title: `Environmental Alert (${alert.alert_type})`,
            problem: 'Environmental conditions outside safe thresholds',
            action: 'Check environmental controls',
          };
      }
    }
    
    // Legacy code for the old alert structure
    if (alert.temperature && (
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_temperature_lower !== null && 
       alert.temperature < alert.paintings?.painting_materials?.[0]?.materials.threshold_temperature_lower) ||
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_temperature_upper !== null && 
       alert.temperature > alert.paintings?.painting_materials?.[0]?.materials.threshold_temperature_upper)
    )) {
      return {
        type: 'temperature',
        icon: <ThermometerIcon />,
        title: `Temperature ${alert.temperature > (alert.paintings?.painting_materials?.[0]?.materials.threshold_temperature_upper || 0) ? 'Too High' : 'Too Low'} (${alert.temperature}°C)`,
        problem: `Temperature ${alert.temperature > (alert.paintings?.painting_materials?.[0]?.materials.threshold_temperature_upper || 0) ? 'exceeds' : 'below'} safe threshold`,
        action: alert.temperature > (alert.paintings?.painting_materials?.[0]?.materials.threshold_temperature_upper || 0) ? 
          'Lower thermostat setting' : 'Increase heating',
      };
    }
    
    if (alert.humidity && (
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_humidity_lower !== null && 
       alert.humidity < alert.paintings?.painting_materials?.[0]?.materials.threshold_humidity_lower) ||
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_humidity_upper !== null && 
       alert.humidity > alert.paintings?.painting_materials?.[0]?.materials.threshold_humidity_upper)
    )) {
      return {
        type: 'humidity',
        icon: <DropletIcon />,
        title: `${alert.humidity > (alert.paintings?.painting_materials?.[0]?.materials.threshold_humidity_upper || 0) ? 'High' : 'Low'} Humidity (${alert.humidity}%)`,
        problem: `Humidity ${alert.humidity > (alert.paintings?.painting_materials?.[0]?.materials.threshold_humidity_upper || 0) ? 'exceeds' : 'below'} safe threshold`,
        action: alert.humidity > (alert.paintings?.painting_materials?.[0]?.materials.threshold_humidity_upper || 0) ? 
          'Adjust dehumidifier settings' : 'Increase humidity',
      };
    }
    
    // If we're still here, check for co2Concentration issues
    if (alert.co2concentration && (
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_co2concentration_lower !== null && 
       alert.co2concentration < alert.paintings?.painting_materials?.[0]?.materials.threshold_co2concentration_lower) ||
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_co2concentration_upper !== null && 
       alert.co2concentration > alert.paintings?.painting_materials?.[0]?.materials.threshold_co2concentration_upper)
    )) {
      return {
        type: 'co2',
        icon: <Wind />,
        title: `${alert.co2concentration > (alert.paintings?.painting_materials?.[0]?.materials.threshold_co2concentration_upper || 0) ? 'High' : 'Low'} CO2 Level (${alert.co2concentration} ppm)`,
        problem: `CO2 level ${alert.co2concentration > (alert.paintings?.painting_materials?.[0]?.materials.threshold_co2concentration_upper || 0) ? 'exceeds' : 'below'} safe threshold`,
        action: alert.co2concentration > (alert.paintings?.painting_materials?.[0]?.materials.threshold_co2concentration_upper || 0) ? 
          'Improve ventilation' : 'Check CO2 sensor calibration',
      };
    }
    
    // Check for mold risk issues
    if (alert.moldrisklevel && (
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_moldrisklevel_lower !== null && 
       alert.moldrisklevel < alert.paintings?.painting_materials?.[0]?.materials.threshold_moldrisklevel_lower) ||
      (alert.paintings?.painting_materials?.[0]?.materials.threshold_moldrisklevel_upper !== null && 
       alert.moldrisklevel > alert.paintings?.painting_materials?.[0]?.materials.threshold_moldrisklevel_upper)
    )) {
      return {
        type: 'mold',
        icon: <AlertCircle />,
        title: `${alert.moldrisklevel > (alert.paintings?.painting_materials?.[0]?.materials.threshold_moldrisklevel_upper || 0) ? 'High' : 'Low'} Mold Risk (Level ${alert.moldrisklevel})`,
        problem: `Mold risk level ${alert.moldrisklevel > (alert.paintings?.painting_materials?.[0]?.materials.threshold_moldrisklevel_upper || 0) ? 'exceeds' : 'below'} safe threshold`,
        action: alert.moldrisklevel > (alert.paintings?.painting_materials?.[0]?.materials.threshold_moldrisklevel_upper || 0) ? 
          'Adjust humidity and temperature' : 'Monitor conditions',
      };
    }
    
    // Default if we can't determine the exact alert type
    return {
      type: 'unknown',
      icon: <AlertCircle />,
      title: 'Environmental Alert',
      problem: 'Environmental conditions outside safe thresholds',
      action: 'Check environmental controls',
    };
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

  return (
    <div className="flex flex-col gap-6">
      {/* Add the DashboardRefresher to listen for data updates */}
      <DashboardRefresher onDataUpdate={fetchDashboardData} />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {lastRefresh && (
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(lastRefresh), 'HH:mm:ss')}
          </div>
        )}
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
              {loading ? '...' : (
                // Try to calculate active devices safely
                devices.filter(d => d.status === 'active' || d.status === 'connected').length
              )}
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
              {loading ? '...' : alerts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {alerts.length > 0 ? 'Require attention' : 'No active alerts'}
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
            {alerts.length > 0 && (
              <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 text-xs font-medium rounded-full h-5 px-2">
                {alerts.length}
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
        ) : alerts.length > 0 ? (
          <div className="grid gap-4">
            {alerts.map((alert, index) => {
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
                      <p><strong>Painting:</strong> {alert.paintings?.name || 'Unknown'} by {alert.paintings?.artist || 'Unknown Artist'}</p>
                      <p><strong>Problem:</strong> {alertInfo.problem}</p>
                      <p><strong>Action:</strong> {alertInfo.action}</p>
                      <p className="text-xs text-muted-foreground">
                        Last updated {alert.timestamp ? getRelativeTime(alert.timestamp) : 'recently'}
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
