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

export default function DashboardPage() {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dataPoints, setDataPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  // Define the fetch function as a callback to prevent unnecessary re-renders
  const fetchDashboardData = useCallback(async (options: { 
    full?: boolean, 
    alerts?: boolean, 
    devices?: boolean,  
    paintings?: boolean, 
    dataPoints?: boolean
  } = { full: true }) => {
    try {
      const { full, alerts: fetchAlerts, devices: fetchDevices, paintings: fetchPaintings, dataPoints: fetchDataPoints } = options;
      
      // Only set loading state for full refreshes
      if (full) {
        setLoading(true);
        setError(null);
      }

      // Fetch paintings if requested
      if (full || fetchPaintings) {
        const paintingsResponse = await fetch('/api/paintings');
        const paintingsData = await paintingsResponse.json();
        if (!paintingsResponse.ok) throw new Error('Failed to fetch paintings');
        setPaintings(paintingsData.paintings || []);
      }

      // Fetch devices if requested
      if (full || fetchDevices) {
        const devicesResponse = await fetch('/api/devices');
        const devicesData = await devicesResponse.json();
        if (!devicesResponse.ok) throw new Error('Failed to fetch devices');
        setDevices(devicesData.devices || []);
      }

      // Fetch alerts if requested (highest priority for updates)
      if (full || fetchAlerts) {
        const alertsResponse = await fetch('/api/alerts?status=active&calculateNew=true');
        const alertsData = await alertsResponse.json();
        if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
        setAlerts(alertsData.alerts || []);
        
        console.log(`Fetched ${alertsData.alerts?.length || 0} active alerts for dashboard`);
        if (alertsData.alerts?.length > 0) {
          console.log('Active alerts:', alertsData.alerts.map((a: any) => `${a.alert_type}: ${a.measured_value}`));
        }
      }
      
      // Fetch environmental data for data points count if requested
      if (full || fetchDataPoints) {
        const envDataResponse = await fetch('/api/environmental-data');
        const envData = await envDataResponse.json();
        if (!envDataResponse.ok) throw new Error('Failed to fetch environmental data');
        setDataPoints(envData.count || 0);
      }
      
      // Update last refresh time
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up initial data fetch
  useEffect(() => {
    fetchDashboardData();
    
    // Set up polling for regular updates (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchDashboardData({ 
        full: false, 
        alerts: true, // Always check for new alerts
        devices: true, // Keep device status updated
      });
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);

  // Handler for data updates from the DashboardRefresher
  const handleDataUpdate = useCallback(() => {
    console.log('Data update received in dashboard');
    // Refresh the most important data (alerts and devices) without loading state
    fetchDashboardData({ 
      full: false, 
      alerts: true,
      devices: true
    });
  }, [fetchDashboardData]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Calculate active devices
  const activeDevices = devices.filter(device => device.status === 'active').length;

  // Get alert info for display
  const getAlertInfo = (alert: any) => {
    const alertType = alert.alert_type?.toLowerCase();
    const thresholdExceeded = alert.threshold_exceeded?.toLowerCase() || 'unknown';
    const isHighAlert = thresholdExceeded === 'upper';
    
    // Default values
    let icon = <AlertCircle className="h-5 w-5 text-amber-500" />;
    let title = 'Alert';
    let problem = 'Unknown issue';
    let action = 'Check device and conditions';
    
    // Match based on alert type
    switch (alertType) {
      case 'temperature':
        icon = <ThermometerIcon className="h-5 w-5 text-amber-500" />;
        title = `Temperature ${isHighAlert ? 'Too High' : 'Too Low'}`;
        problem = `Temperature of ${alert.measured_value}°C ${isHighAlert ? 'exceeds' : 'is below'} the ${isHighAlert ? 'upper' : 'lower'} threshold of ${alert.threshold_value}°C`;
        action = isHighAlert ? 'Reduce temperature in the environment' : 'Increase temperature in the environment';
        break;
      case 'humidity':
        icon = <DropletIcon className="h-5 w-5 text-amber-500" />;
        title = `Humidity ${isHighAlert ? 'Too High' : 'Too Low'}`;
        problem = `Humidity of ${alert.measured_value}% ${isHighAlert ? 'exceeds' : 'is below'} the ${isHighAlert ? 'upper' : 'lower'} threshold of ${alert.threshold_value}%`;
        action = isHighAlert ? 'Reduce humidity in the environment' : 'Increase humidity in the environment';
        break;
      case 'co2':
      case 'co2concentration':
        icon = <Wind className="h-5 w-5 text-amber-500" />;
        title = `CO₂ Level ${isHighAlert ? 'Too High' : 'Too Low'}`;
        problem = `CO₂ concentration of ${alert.measured_value} ppm ${isHighAlert ? 'exceeds' : 'is below'} the ${isHighAlert ? 'upper' : 'lower'} threshold of ${alert.threshold_value} ppm`;
        action = isHighAlert ? 'Improve ventilation to reduce CO₂ levels' : 'Check ventilation system functionality';
        break;
      case 'moldrisk':
      case 'mold_risk_level':
      case 'moldrisklevel':
        icon = <AlertCircle className="h-5 w-5 text-amber-500" />;
        title = 'High Mold Risk';
        problem = `Mold risk level of ${alert.measured_value} exceeds the threshold of ${alert.threshold_value}`;
        action = 'Check humidity and temperature conditions, improve air circulation';
        break;
      case 'airpressure':
        icon = <Cloud className="h-5 w-5 text-amber-500" />;
        title = `Air Pressure ${isHighAlert ? 'Too High' : 'Too Low'}`;
        problem = `Air pressure of ${alert.measured_value} hPa ${isHighAlert ? 'exceeds' : 'is below'} the ${isHighAlert ? 'upper' : 'lower'} threshold of ${alert.threshold_value} hPa`;
        action = 'Ensure environmental controls are functioning properly';
        break;
      default:
        // Generic alert for unknown types
        title = `${alertType || 'Environmental Parameter'} ${isHighAlert ? 'Too High' : 'Too Low'}`;
        problem = `Measured value of ${alert.measured_value} ${isHighAlert ? 'exceeds' : 'is below'} the ${isHighAlert ? 'upper' : 'lower'} threshold of ${alert.threshold_value}`;
        action = 'Check environmental conditions and sensor functionality';
    }
    
    return { icon, title, problem, action };
  };

  // For getting relative time in a more readable format
  const getRelativeTime = (timestamp: string) => {
    try {
      return formatRelativeTime(new Date(timestamp));
    } catch (err) {
      return 'Unknown time';
    }
  };

  // Function to deduplicate alerts (show only one per painting & type)
  const getDeduplicatedAlerts = (alerts: Alert[]): Alert[] => {
    const uniqueAlertMap = new Map<string, Alert>();
    
    alerts.forEach((alert) => {
      // Create a unique key based on painting ID and alert type
      const key = `${alert.painting_id}-${alert.alert_type}-${alert.threshold_exceeded}`;
      
      // Only keep the most recent alert for each unique combination
      if (!uniqueAlertMap.has(key) || 
          new Date(alert.timestamp) > new Date(uniqueAlertMap.get(key)!.timestamp)) {
        uniqueAlertMap.set(key, alert);
      }
    });
    
    // Convert map back to array and sort by most recent first
    return Array.from(uniqueAlertMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
        return `High Mold Risk`;
      case 'airpressure':
        return `Air Pressure ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
      default:
        return `Alert: ${alertType || 'Unknown'} ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'}`;
    }
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
  
  // State for alert details dialog
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  
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

  // Get deduplicated alerts for display
  const deduplicatedAlerts = getDeduplicatedAlerts(alerts);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="text-sm text-muted-foreground">
            Last updated: {format(new Date(lastRefresh), 'HH:mm:ss')}
          </span>
          <button 
            onClick={handleRefresh}
            className="rounded-full p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title="Refresh dashboard data"
          >
            <RefreshCcw className="h-4 w-4" />
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
      
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-2 border-l-blue-400">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Paintings</CardTitle>
              <FrameIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {loading ? '...' : paintings.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monitored artworks</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-2 border-l-green-400">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <DevicesIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {loading ? '...' : activeDevices}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? '...' : `${devices.length} total devices`}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-2 border-l-amber-400">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <BellIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600">
              {loading ? '...' : deduplicatedAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {deduplicatedAlerts.length > 0 ? 'Require attention' : 'No active alerts'}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-2 border-l-purple-400">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {loading ? '...' : dataPoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total measurements</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
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
          <Card className="p-4 sm:p-6 text-center text-muted-foreground">
            Loading alerts...
          </Card>
        ) : deduplicatedAlerts.length > 0 ? (
          <div className="grid gap-2">
            {deduplicatedAlerts.map((alert, index) => {
              const alertInfo = getAlertInfo(alert);
              const paintingName = alert.paintings?.name || `Painting ID: ${alert.painting_id}`;
              const artistName = alert.paintings?.artist || 'Unknown Artist';
              return (
                <button 
                  key={alert.id || index} 
                  className="text-left w-full"
                  onClick={() => showAlertDetails(alert)}
                >
                  <Alert variant="warning" className="shadow-sm border-l-2 border-l-amber-400 relative pr-10 cursor-pointer hover:bg-amber-50 py-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismissAlert(alert.id);
                      }}
                      className="absolute top-2 right-2 text-amber-500 hover:text-amber-700 transition-colors"
                      aria-label="Dismiss alert"
                      title="Dismiss alert"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m15 9-6 6" />
                        <path d="m9 9 6 6" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      {alertInfo.icon}
                      <div>
                        <AlertTitle className="font-semibold mb-0 truncate">{alertInfo.title}</AlertTitle>
                        <AlertDescription className="mt-0">
                          <p className="text-sm truncate">{paintingName}</p>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                </button>
              );
            })}
          </div>
        ) : (
          <Card className="p-4 sm:p-6 text-center">
            <p className="text-muted-foreground">No active alerts at this time</p>
          </Card>
        )}
        
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                
                {(() => {
                  const alertInfo = getAlertInfo(selectedAlert);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {alertInfo.icon}
                        <span className="font-semibold text-lg">{alertInfo.title}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <p><strong>Painting:</strong> {selectedAlert.paintings?.name 
                          ? `${selectedAlert.paintings.name} by ${selectedAlert.paintings.artist || 'Unknown Artist'}` 
                          : `ID: ${selectedAlert.painting_id || 'Unknown'}`}</p>
                        <p><strong>Problem:</strong> {alertInfo.problem}</p>
                        <p><strong>Action:</strong> {alertInfo.action}</p>
                        <p className="text-sm text-muted-foreground">
                          Last updated {selectedAlert.timestamp ? formatRelativeTime(new Date(selectedAlert.timestamp)) : 'recently'}
                        </p>
                      </div>
                      
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          onClick={closeAlertDialog}
                          className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 font-medium"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => {
                            handleDismissAlert(selectedAlert.id);
                            closeAlertDialog();
                          }}
                          className="px-4 py-2 bg-amber-500 rounded-md text-white hover:bg-amber-600 font-medium"
                        >
                          Dismiss Alert
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
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