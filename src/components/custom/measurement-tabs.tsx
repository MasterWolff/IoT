'use client';

import { useState } from 'react';
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

const tabData = {
  temperature: {
    title: "Temperature Readings",
    description: "Last 5 temperature readings across monitored paintings",
    headers: ["Painting", "Temperature", "Time", "Status"],
    data: [
      { painting: "The Night Watch", value: "26°C", time: "10:45 AM", status: "Alert" },
      { painting: "Sunflowers", value: "22°C", time: "10:40 AM", status: "Normal" },
      { painting: "Water Lilies", value: "21°C", time: "10:30 AM", status: "Normal" },
      { painting: "The Persistence of Memory", value: "20°C", time: "10:20 AM", status: "Normal" },
      { painting: "Girl with a Pearl Earring", value: "22°C", time: "10:15 AM", status: "Normal" },
    ]
  },
  humidity: {
    title: "Humidity Readings",
    description: "Last 5 humidity readings across monitored paintings",
    headers: ["Painting", "Humidity", "Time", "Status"],
    data: [
      { painting: "Sunflowers", value: "70%", time: "10:45 AM", status: "Alert" },
      { painting: "The Night Watch", value: "55%", time: "10:40 AM", status: "Normal" },
      { painting: "Water Lilies", value: "52%", time: "10:30 AM", status: "Normal" },
    ]
  },
  light: {
    title: "Light Readings",
    description: "Last 5 light readings across monitored paintings",
    headers: ["Painting", "Illuminance", "Time", "Status"],
    data: [
      { painting: "Water Lilies", value: "250 lux", time: "10:30 AM", status: "Alert" },
      { painting: "Sunflowers", value: "180 lux", time: "10:40 AM", status: "Normal" },
      { painting: "The Night Watch", value: "160 lux", time: "10:45 AM", status: "Normal" },
    ]
  },
  co2: {
    title: "CO2 Readings",
    description: "Last 5 CO2 readings across monitored paintings",
    headers: ["Painting", "CO2 Level", "Time", "Status"],
    data: [
      { painting: "The Night Watch", value: "600 ppm", time: "10:45 AM", status: "Normal" },
      { painting: "Sunflowers", value: "550 ppm", time: "10:40 AM", status: "Normal" },
      { painting: "Water Lilies", value: "580 ppm", time: "10:30 AM", status: "Normal" },
    ]
  }
};

export function MeasurementTabs() {
  const [activeTab, setActiveTab] = useState<'temperature' | 'humidity' | 'light' | 'co2'>('temperature');
  
  const currentTabData = tabData[activeTab];
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight mb-4">Recent Measurements</h2>
      
      <div className="border rounded-lg p-1 bg-white shadow-sm max-w-md">
        <div className="grid grid-cols-4 w-full">
          {(Object.keys(tabData) as Array<keyof typeof tabData>).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{currentTabData.title}</CardTitle>
          <CardDescription>{currentTabData.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">{currentTabData.headers[0]}</TableHead>
                <TableHead>{currentTabData.headers[1]}</TableHead>
                <TableHead>{currentTabData.headers[2]}</TableHead>
                <TableHead className="text-right">{currentTabData.headers[3]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTabData.data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.painting}</TableCell>
                  <TableCell>{row.value}</TableCell>
                  <TableCell>{row.time}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.status === 'Alert' ? 'destructive' : 'secondary'}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 