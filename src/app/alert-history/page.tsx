'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutList,
  Filter
} from "lucide-react";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';

// Define a type for paintings
type Painting = {
  id: string;
  name: string;
  artist: string;
  creation_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Define types for alerts
type AlertHistoryItem = {
  id: string;
  painting_id: string;
  alert_type: string;
  threshold_exceeded: 'upper' | 'lower';
  measured_value: number;
  threshold_value: number;
  status: 'active' | 'dismissed';
  timestamp: string;
  created_at: string;
  dismissed_at: string | null;
  paintings?: {
    name: string;
    artist: string;
  };
};

export default function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  // Fetch all alerts, including dismissed ones
  const fetchAlertHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all alerts from our consolidated alerts API
      const response = await fetch('/api/alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch alert history');
      }
      
      const data = await response.json();
      const alerts = data.alerts || [];
      
      // Fetch paintings to add painting names to alerts that don't have that info
      const paintingsResponse = await fetch('/api/paintings');
      if (paintingsResponse.ok) {
        const paintingsData = await paintingsResponse.json();
        const paintings = paintingsData.paintings || [];
        
        // Create a map of painting IDs to painting info
        const paintingMap = new Map<string, Painting>();
        paintings.forEach((painting: Painting) => {
          paintingMap.set(painting.id, painting);
        });
        
        // Add painting info to alerts that don't have it
        for (const alert of alerts) {
          if (!alert.paintings && alert.painting_id) {
            const painting = paintingMap.get(alert.painting_id);
            if (painting) {
              alert.paintings = {
                name: painting.name,
                artist: painting.artist
              };
            }
          }
        }
      }
      
      setAlerts(alerts);
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching alert history:', err);
      setError('Failed to load alert history. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAlertHistory();
  }, [fetchAlertHistory]);

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

      // Update the alert in the UI
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'dismissed', dismissed_at: new Date().toISOString() } 
            : alert
        )
      );
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  }, []);

  // Function to reactivate a dismissed alert
  const handleReactivateAlert = useCallback(async (alertId: string) => {
    try {
      // Update the alert status in the database
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: alertId,
          status: 'active'
        }),
      });

      if (!response.ok) {
        console.error('Failed to reactivate alert:', await response.text());
        return;
      }

      // Update the alert in the UI
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'active', dismissed_at: null } 
            : alert
        )
      );
    } catch (err) {
      console.error('Error reactivating alert:', err);
    }
  }, []);

  // Helper function to get alert details
  const getAlertInfo = (alert: AlertHistoryItem) => {
    // Get alert type details for UI display
    switch (alert.alert_type) {
      case 'temperature':
        return {
          title: `Temperature ${alert.threshold_exceeded === 'upper' ? 'Too High' : 'Too Low'} (${alert.measured_value}°C)`,
          problem: `Temperature ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value}°C`,
          action: alert.threshold_exceeded === 'upper' ? 'Lower thermostat setting' : 'Increase heating',
        };
      
      case 'humidity':
        return {
          title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} Humidity (${alert.measured_value}%)`,
          problem: `Humidity ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value}%`,
          action: alert.threshold_exceeded === 'upper' ? 'Adjust dehumidifier settings' : 'Increase humidity',
        };
        
      case 'co2':
        return {
          title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} CO2 Level (${alert.measured_value} ppm)`,
          problem: `CO2 level ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value} ppm`,
          action: alert.threshold_exceeded === 'upper' ? 'Improve ventilation' : 'Check CO2 sensor calibration',
        };
        
      case 'mold_risk_level':
        return {
          title: `High Mold Risk (Level ${alert.measured_value})`,
          problem: `Mold risk level is high`,
          action: `Adjust humidity and temperature to reduce mold growth risk`,
        };
        
      case 'airpressure':
        return {
          title: `${alert.threshold_exceeded === 'upper' ? 'High' : 'Low'} Air Pressure (${alert.measured_value} hPa)`,
          problem: `Air pressure ${alert.threshold_exceeded === 'upper' ? 'exceeds' : 'below'} safe threshold of ${alert.threshold_value} hPa`,
          action: alert.threshold_exceeded === 'upper' ? 'Check ventilation' : 'Monitor conditions',
        };
        
      default:
        return {
          title: `Environmental Alert (${alert.alert_type})`,
          problem: 'Environmental conditions outside safe thresholds',
          action: 'Check environmental controls',
        };
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Filter alerts based on active tab
  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return alert.status === 'active';
    if (activeTab === 'dismissed') return alert.status === 'dismissed';
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Alert History</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(lastRefresh), 'HH:mm:ss')}
          </div>
          <button 
            onClick={fetchAlertHistory}
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Alert Records</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <LayoutList size={16} />
                Back to Dashboard
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
              <TabsList>
                <TabsTrigger value="all" className="flex items-center gap-1">
                  <Filter size={14} />
                  All
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-1">
                  <AlertCircle size={14} className="text-red-500" />
                  Active
                </TabsTrigger>
                <TabsTrigger value="dismissed" className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-green-500" />
                  Dismissed
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="text-sm text-muted-foreground">
              {filteredAlerts.length} alerts
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
              Loading alert history...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No alerts found for the selected filter.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAlerts.map((alert) => {
                const alertInfo = getAlertInfo(alert);
                return (
                  <Alert 
                    key={alert.id} 
                    variant={alert.status === 'active' ? "warning" : "subtle"}
                    className={`shadow-sm border-l-2 relative ${
                      alert.status === 'active' ? 'border-l-amber-400' : 'border-l-gray-300'
                    }`}
                  >
                    {/* Add action button based on status */}
                    {alert.status === 'active' ? (
                      <button 
                        onClick={() => handleDismissAlert(alert.id)}
                        className="absolute top-3 right-3 text-amber-500 hover:text-amber-700 transition-colors"
                        aria-label="Dismiss alert"
                        title="Dismiss alert"
                      >
                        <XCircle size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleReactivateAlert(alert.id)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Reactivate alert"
                        title="Reactivate alert"
                      >
                        <RefreshCcw size={18} />
                      </button>
                    )}
                    
                    {alert.status === 'active' ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    
                    <AlertTitle className="font-semibold flex items-center gap-2">
                      {alertInfo.title}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        alert.status === 'active' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {alert.status}
                      </span>
                    </AlertTitle>
                    
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        {alert.paintings ? (
                          <p><strong>Painting:</strong> {alert.paintings.name || 'Unknown'} by {alert.paintings.artist || 'Unknown Artist'}</p>
                        ) : (
                          <p><strong>Painting ID:</strong> {alert.painting_id || 'Unknown'}</p>
                        )}
                        <p><strong>Problem:</strong> {alertInfo.problem}</p>
                        <p><strong>Action:</strong> {alertInfo.action}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>Detected: {formatDate(alert.timestamp)}</span>
                          </div>
                          {alert.status === 'dismissed' && alert.dismissed_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>Dismissed: {formatDate(alert.dismissed_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 