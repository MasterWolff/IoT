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

export function MeasurementTabs() {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight mb-4">Recent Measurements</h2>
      <Tabs defaultValue="temperature" className="w-full">
        <TabsList className="mb-4 h-12">
          <TabsTrigger value="temperature" className="px-6 py-3 text-base">Temperature</TabsTrigger>
          <TabsTrigger value="humidity" className="px-6 py-3 text-base">Humidity</TabsTrigger>
          <TabsTrigger value="light" className="px-6 py-3 text-base">Light</TabsTrigger>
          <TabsTrigger value="co2" className="px-6 py-3 text-base">CO2</TabsTrigger>
        </TabsList>
        
        <TabsContent value="temperature">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Temperature Readings</CardTitle>
              <CardDescription>Last 5 temperature readings across monitored paintings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Painting</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">The Night Watch</TableCell>
                    <TableCell>26°C</TableCell>
                    <TableCell>10:45 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="destructive">Alert</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Sunflowers</TableCell>
                    <TableCell>22°C</TableCell>
                    <TableCell>10:40 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Water Lilies</TableCell>
                    <TableCell>21°C</TableCell>
                    <TableCell>10:30 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">The Persistence of Memory</TableCell>
                    <TableCell>20°C</TableCell>
                    <TableCell>10:20 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Girl with a Pearl Earring</TableCell>
                    <TableCell>22°C</TableCell>
                    <TableCell>10:15 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="humidity">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Humidity Readings</CardTitle>
              <CardDescription>Last 5 humidity readings across monitored paintings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Painting</TableHead>
                    <TableHead>Humidity</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Sunflowers</TableCell>
                    <TableCell>70%</TableCell>
                    <TableCell>10:45 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="destructive">Alert</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">The Night Watch</TableCell>
                    <TableCell>55%</TableCell>
                    <TableCell>10:40 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Water Lilies</TableCell>
                    <TableCell>52%</TableCell>
                    <TableCell>10:30 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="light">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Light Readings</CardTitle>
              <CardDescription>Last 5 light readings across monitored paintings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Painting</TableHead>
                    <TableHead>Illuminance</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Water Lilies</TableCell>
                    <TableCell>250 lux</TableCell>
                    <TableCell>10:30 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="destructive">Alert</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Sunflowers</TableCell>
                    <TableCell>180 lux</TableCell>
                    <TableCell>10:40 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">The Night Watch</TableCell>
                    <TableCell>160 lux</TableCell>
                    <TableCell>10:45 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="co2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>CO2 Readings</CardTitle>
              <CardDescription>Last 5 CO2 readings across monitored paintings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Painting</TableHead>
                    <TableHead>CO2 Level</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">The Night Watch</TableCell>
                    <TableCell>600 ppm</TableCell>
                    <TableCell>10:45 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Sunflowers</TableCell>
                    <TableCell>550 ppm</TableCell>
                    <TableCell>10:40 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Water Lilies</TableCell>
                    <TableCell>580 ppm</TableCell>
                    <TableCell>10:30 AM</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">Normal</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
} 