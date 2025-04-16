"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Settings, 
  RefreshCw, 
  TabletSmartphone,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { getDevices } from "@/lib/clientApi";

interface Device {
  id: string;
  arduino_device_id: string | null;
  painting_id: string | null;
  last_calibration_date: string | null;
  last_measurement: string | null;
  created_at: string;
  updated_at: string;
  status?: string;
  paintings?: {
    name: string;
    artist: string;
  };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const data = await getDevices();
        
        // Log the first device to help diagnose data issues
        if (data && data.length > 0) {
          console.log("First device data:", data[0]);
        }
        
        // Add status field based on last_measurement
        const enrichedData = data.map(device => {
          let status = "offline";
          
          if (device.last_measurement) {
            // Calculate time difference in hours
            const lastMeasurement = new Date(device.last_measurement);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastMeasurement.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff < 1) {
              status = "online";
            } else if (hoursDiff < 24) {
              status = "maintenance";
            }
          }
          
          return { ...device, status };
        });
        
        setDevices(enrichedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching devices:", error);
        setLoading(false);
      }
    }
    
    fetchDevices();
  }, []);

  // Helper function to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not available";
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status icon based on status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'maintenance':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Get badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'online':
        return "success";
      case 'offline':
        return "destructive";
      case 'maintenance':
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground mt-1">Manage your IoT devices and view their status</p>
        </div>
        <Button className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Device
        </Button>
      </div>
      
      <Card className="shadow-sm border-t-2 border-t-blue-300">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TabletSmartphone className="h-5 w-5 text-muted-foreground" />
            <CardTitle>All Devices</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading devices data...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[15%]">Device ID</TableHead>
                    <TableHead className="w-[25%]">Associated Painting</TableHead>
                    <TableHead>Last Calibration</TableHead>
                    <TableHead>Last Measurement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No devices found in the database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    devices.map((device) => (
                      <TableRow key={device.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {device.arduino_device_id || device.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          {device.paintings?.name || "Not assigned"}
                        </TableCell>
                        <TableCell>
                          {device.last_calibration_date 
                            ? formatDate(device.last_calibration_date) 
                            : "Not calibrated"}
                        </TableCell>
                        <TableCell>
                          {device.last_measurement 
                            ? formatDate(device.last_measurement) 
                            : "No data yet"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(device.status || 'offline')}
                            <Badge variant={getStatusBadgeVariant(device.status || 'offline') as any}>
                              {device.status ? device.status.charAt(0).toUpperCase() + device.status.slice(1) : 'Offline'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" className="flex items-center">
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              Calibrate
                            </Button>
                            <Button variant="outline" size="sm" className="flex items-center">
                              <Settings className="h-3.5 w-3.5 mr-1" />
                              Config
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 