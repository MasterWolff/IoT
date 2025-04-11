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
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getPaintings } from "@/lib/clientApi";
import type { Painting } from "@/lib/supabase";
import Link from "next/link";

export default function PaintingsPage() {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialsByPainting, setMaterialsByPainting] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch paintings data
        const paintingsData = await getPaintings();
        
        // Log the first painting to help diagnose data issues
        if (paintingsData && paintingsData.length > 0) {
          console.log("First painting data:", paintingsData[0]);
        }
        
        setPaintings(paintingsData);

        // Fetch materials for each painting
        const materialsPromises = paintingsData.map(async (painting) => {
          try {
            const response = await fetch(`/api/painting-materials?paintingId=${painting.id}`);
            const data = await response.json();
            
            if (data.success && data.painting_materials) {
              // Map the materials from the painting_materials array
              const materials = data.painting_materials.map((pm: any) => 
                pm.materials?.name || 'Unknown'
              );
              return { paintingId: painting.id, materials };
            }
            return { paintingId: painting.id, materials: [] };
          } catch (err) {
            console.error(`Error fetching materials for painting ${painting.id}:`, err);
            return { paintingId: painting.id, materials: [] };
          }
        });

        const materialsResults = await Promise.all(materialsPromises);
        const materialsMap: Record<string, string[]> = {};
        
        materialsResults.forEach((result) => {
          materialsMap[result.paintingId] = result.materials;
        });
        
        setMaterialsByPainting(materialsMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching paintings data:", error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Function to determine painting status
  const getPaintingStatus = (paintingId: string) => {
    // In a real app, this would check for alerts related to this painting
    // For now, we'll randomize it for demonstration
    const statuses = ["normal", "alert"];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Paintings</h1>
        <Button className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Painting
        </Button>
      </div>
      
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Paintings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading paintings data...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Name</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Creation Date</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paintings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No paintings found in the database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paintings.map((painting) => {
                      const paintingStatus = getPaintingStatus(painting.id);
                      return (
                        <TableRow key={painting.id}>
                          <TableCell className="font-medium">{painting.name}</TableCell>
                          <TableCell>{painting.artist}</TableCell>
                          <TableCell>{painting.creation_date || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {materialsByPainting[painting.id]?.length > 0 ? (
                                materialsByPainting[painting.id].map((material, idx) => (
                                  <Badge key={idx} variant="outline">{material}</Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">No materials</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={paintingStatus === "alert" ? "destructive" : "secondary"}>
                              {paintingStatus === "alert" ? "Alert" : "Normal"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Link href={`/paintings/${painting.id}`}>
                                <Button variant="outline" size="sm">View</Button>
                              </Link>
                              <Button variant="outline" size="sm">Edit</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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