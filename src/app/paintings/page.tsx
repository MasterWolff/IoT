"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Frame, Building2, Calendar, AlertCircle, Clock, Heart } from "lucide-react";
import { getPaintings } from "@/lib/clientApi";
import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';

interface Painting {
  id: string;
  name: string;
  artist: string;
  creation_date: string | null;
  created_at: string;
  updated_at: string;
  image_path: string | null;
  // Extended properties calculated in the component
  year?: string;
  location?: string;
  alerts_count?: number;
}

export default function PaintingsPage() {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertsByPainting, setAlertsByPainting] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchAlerts() {
      try {
        // Fetch active alerts
        const { data: alerts, error } = await supabase
          .from('alerts')
          .select('painting_id, id')
          .eq('status', 'active');
        
        if (error) {
          console.error("Error fetching alerts:", error);
          return {};
        }
        
        // Count alerts per painting
        const alertCounts: Record<string, number> = {};
        alerts?.forEach(alert => {
          if (alert.painting_id) {
            alertCounts[alert.painting_id] = (alertCounts[alert.painting_id] || 0) + 1;
          }
        });
        
        setAlertsByPainting(alertCounts);
        return alertCounts;
      } catch (error) {
        console.error("Error in fetchAlerts:", error);
        return {};
      }
    }
    
    async function fetchPaintings() {
      try {
        const paintingsData = await getPaintings();
        const alertCounts = await fetchAlerts();
        
        // Enrich data with actual alert counts and fixed locations
        const locationsMap: Record<string, string> = {
          'Mona Lisa': 'Gallery Room 1',
          'The Starry Night': 'Gallery Room 3',
          'Guernica': 'Gallery Room 8',
          'The Persistence of Memory': 'Gallery Room 4',
          'The Scream': 'Gallery Room 4',
        };
        
        const enrichedData = paintingsData.map(painting => {
          return {
            ...painting,
            year: painting.creation_date?.split('-')[0] || 'Unknown', // Extract year from creation_date
            location: locationsMap[painting.name] || 'Gallery Room ' + Math.floor(Math.random() * 10 + 1),
            alerts_count: alertCounts[painting.id] || 0
          };
        });
        
        setPaintings(enrichedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching paintings:", error);
        setLoading(false);
      }
    }
    
    fetchPaintings();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paintings</h1>
          <p className="text-muted-foreground mt-1">Manage your collection of paintings and their monitoring setup</p>
        </div>
        <Button className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Painting
        </Button>
      </div>
      
      <Card className="shadow-sm border-t-2 border-t-blue-300">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Frame className="h-5 w-5 text-muted-foreground" />
            <CardTitle>All Paintings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading paintings data...</div>
          ) : (
            <>
              {/* Mobile Card View - shown below lg breakpoint */}
              <div className="lg:hidden space-y-4">
                {paintings.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No paintings found in the database.
                  </div>
                ) : (
                  paintings.map((painting) => (
                    <Card key={painting.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg line-clamp-1">
                              {painting.name}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              by {painting.artist}
                            </p>
                          </div>
                          <Badge 
                            variant={painting.alerts_count ? "warning" : "success"}
                            className="flex items-center gap-1"
                          >
                            {painting.alerts_count ? (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                {painting.alerts_count} alert{painting.alerts_count !== 1 ? 's' : ''}
                              </>
                            ) : (
                              <>
                                <Heart className="h-3 w-3" />
                                Healthy
                              </>
                            )}
                          </Badge>
                        </div>
                        
                        <div className="mt-4 space-y-2 text-sm">
                          {/* Year */}
                          <div className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400 flex-shrink-0" />
                            <div className="text-slate-600">
                              {painting.year || "Unknown year"}
                            </div>
                          </div>
                          
                          {/* Location */}
                          <div className="flex items-center">
                            <Building2 className="h-3.5 w-3.5 mr-2 text-slate-400 flex-shrink-0" />
                            <div className="text-slate-600">
                              {painting.location || "Location not specified"}
                            </div>
                          </div>
                          
                          {/* Last Updated */}
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-2 text-slate-400 flex-shrink-0" />
                            <div className="text-slate-600">
                              Updated {new Date(painting.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-slate-50 p-3 border-t flex justify-end">
                        <Link href={`/paintings/${painting.id}`}>
                          <Button size="sm">View Details</Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
              
              {/* Desktop Table View - hidden below lg breakpoint */}
              <div className="hidden lg:block rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[25%]">Name</TableHead>
                      <TableHead className="w-[20%]">Artist</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Location</TableHead>
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
                      paintings.map((painting) => (
                        <TableRow key={painting.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {painting.name}
                          </TableCell>
                          <TableCell>
                            {painting.artist}
                          </TableCell>
                          <TableCell>
                            {painting.year || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {painting.location || "Not specified"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={painting.alerts_count ? "warning" : "success"}
                            >
                              {painting.alerts_count ? (
                                <>
                                  {painting.alerts_count} alert{painting.alerts_count !== 1 ? 's' : ''}
                                </>
                              ) : (
                                <>Healthy</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Link href={`/paintings/${painting.id}`}>
                                <Button variant="default" size="sm">
                                  View Details
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Edit Painting</DropdownMenuItem>
                                  <DropdownMenuItem>Monitoring Setup</DropdownMenuItem>
                                  <DropdownMenuItem>View History</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    Delete Painting
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 