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

interface PaintingDetails extends Painting {
  painting_materials: Array<{
    material_id: string;
    materials: {
      name: string;
      description: string | null;
    };
  }>;
  environmental_data: EnvironmentalData[];
}

export default function PaintingDetailsPage({ params }: { params: { id: string } }) {
  const paintingId = params.id;
  const [painting, setPainting] = useState<PaintingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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
          const fileName = data.image_path.split('/').pop(); // Get just the filename
          const { data: publicUrl } = supabase
            .storage
            .from('painting-images')
            .getPublicUrl(fileName || '');
          setImageUrl(publicUrl.publicUrl);
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
    CO2: Number(data.co2) || 0,
    Light: Number(data.illuminance) || 0
  })).sort((a, b) => {
    // Sort by time to ensure proper line chart display
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  }) || [];

  const metrics = {
    temperature: chartData.map(d => d.Temperature),
    humidity: chartData.map(d => d.Humidity),
    co2: chartData.map(d => d.CO2),
    light: chartData.map(d => d.Light)
  };

  const valueFormatter = (number: number) => `${number.toFixed(1)}`;

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
                      categories={["Light"]}
                      index="time"
                      colors={["yellow"]}
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