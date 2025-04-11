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
import { PlusCircle, Eye, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { getMaterials } from "@/lib/clientApi";
import type { Material } from "@/lib/supabase";

// Extended interface that includes any potential fields not in the type definition
interface ExtendedMaterial extends Material {
  [key: string]: any; // Allow any other properties
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<ExtendedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<ExtendedMaterial | null>(null);

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const data = await getMaterials();
        
        // Log the raw data to diagnose field name issues
        if (data.length > 0) {
          console.log("First material raw data:", data[0]);
        }
        
        setMaterials(data);
        
        // Set the first material as selected if available
        if (data.length > 0) {
          setSelectedMaterial(data[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching materials:", error);
        setLoading(false);
      }
    }

    fetchMaterials();
  }, []);

  // Helper function to format range values with robust error handling
  const formatRange = (lower: number | null | undefined, upper: number | null | undefined, unit: string) => {
    // Handle case where the properties might be undefined
    if (lower === undefined && upper === undefined) {
      return "Not defined";
    }
    
    // Convert undefined to null for consistent handling
    const lowerValue = lower === undefined ? null : lower;
    const upperValue = upper === undefined ? null : upper;
    
    if (lowerValue === null && upperValue === null) {
      return "Not specified";
    } else if (lowerValue !== null && upperValue !== null) {
      return `${lowerValue}-${upperValue}${unit ? ` ${unit}` : ''}`;
    } else if (lowerValue !== null) {
      return `>${lowerValue}${unit ? ` ${unit}` : ''}`;
    } else if (upperValue !== null) {
      return `<${upperValue}${unit ? ` ${unit}` : ''}`;
    }
    return "Not specified";
  };

  // Helper function to safely get values handling different property names
  const getThresholdValues = (material: any, baseField: string) => {
    // Check field naming patterns based on the actual data structure from API
    if (baseField === 'co2') {
      return {
        lower: material.threshold_co2concentration_lower,
        upper: material.threshold_co2concentration_upper
      };
    } 
    
    if (baseField === 'mold_risk_level') {
      return {
        lower: material.threshold_moldrisklevel_lower,
        upper: material.threshold_moldrisklevel_upper
      };
    }
    
    if (baseField === 'illuminance') {
      return {
        lower: material.threshold_illuminance_lower,
        upper: material.threshold_illuminance_upper
      };
    }
    
    // For temperature and humidity, the naming is consistent with our expected pattern
    return {
      lower: material[`threshold_${baseField}_lower`],
      upper: material[`threshold_${baseField}_upper`]
    };
  };

  // For debugging
  useEffect(() => {
    if (materials.length > 0) {
      console.log("First material data:", materials[0]);
    }
  }, [materials]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
        <Button className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Material
        </Button>
      </div>
      
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Art Materials & Environmental Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading materials data...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Material</TableHead>
                    <TableHead>Temperature Range (°C)</TableHead>
                    <TableHead>Humidity Range (%)</TableHead>
                    <TableHead>CO₂ Range (ppm)</TableHead>
                    <TableHead>Illuminance (lux)</TableHead>
                    <TableHead>Mold Risk Level</TableHead>
                    <TableHead>Max Air Pressure (hPa/hr)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No materials found in the database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    materials.map((material) => {
                      const temp = getThresholdValues(material, 'temperature');
                      const humidity = getThresholdValues(material, 'humidity');
                      const co2 = getThresholdValues(material, 'co2');
                      const moldRisk = getThresholdValues(material, 'mold_risk_level');
                      const illuminance = getThresholdValues(material, 'illuminance');
                      
                      return (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell>
                            {formatRange(temp.lower, temp.upper, '°C')}
                          </TableCell>
                          <TableCell>
                            {formatRange(humidity.lower, humidity.upper, '%')}
                          </TableCell>
                          <TableCell>
                            {formatRange(co2.lower, co2.upper, 'ppm')}
                          </TableCell>
                          <TableCell>
                            {formatRange(illuminance.lower, illuminance.upper, 'lux')}
                          </TableCell>
                          <TableCell>
                            {formatRange(moldRisk.lower, moldRisk.upper, '')}
                          </TableCell>
                          <TableCell>
                            {material.max_allowable_airpressure_change !== null && 
                             material.max_allowable_airpressure_change !== undefined
                              ? `${material.max_allowable_airpressure_change} hPa/hr` 
                              : 'Not specified'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center"
                                onClick={() => setSelectedMaterial(material)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                              <Button variant="outline" size="sm" className="flex items-center">
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
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

      {selectedMaterial && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Material Detail</h2>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>{selectedMaterial.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Environmental Thresholds</h3>
                  <div className="space-y-3 rounded-lg border p-4 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Temperature</span>
                      <Badge variant="outline" className="font-mono">
                        {formatRange(
                          getThresholdValues(selectedMaterial, 'temperature').lower,
                          getThresholdValues(selectedMaterial, 'temperature').upper,
                          '°C'
                        )}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Humidity</span>
                      <Badge variant="outline" className="font-mono">
                        {formatRange(
                          getThresholdValues(selectedMaterial, 'humidity').lower,
                          getThresholdValues(selectedMaterial, 'humidity').upper,
                          '%'
                        )}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">CO₂ Concentration</span>
                      <Badge variant="outline" className="font-mono">
                        {formatRange(
                          getThresholdValues(selectedMaterial, 'co2').lower,
                          getThresholdValues(selectedMaterial, 'co2').upper,
                          'ppm'
                        )}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Illuminance</span>
                      <Badge variant="outline" className="font-mono">
                        {formatRange(
                          getThresholdValues(selectedMaterial, 'illuminance').lower,
                          getThresholdValues(selectedMaterial, 'illuminance').upper,
                          'lux'
                        )}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Max Air Pressure Change</span>
                      <Badge variant="outline" className="font-mono">
                        {selectedMaterial.max_allowable_airpressure_change !== null && 
                         selectedMaterial.max_allowable_airpressure_change !== undefined
                          ? `${selectedMaterial.max_allowable_airpressure_change} hPa/hr` 
                          : 'Not specified'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Mold Risk Level</span>
                      <Badge variant="outline" className="font-mono">
                        {formatRange(
                          getThresholdValues(selectedMaterial, 'mold_risk_level').lower,
                          getThresholdValues(selectedMaterial, 'mold_risk_level').upper,
                          ''
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Used In Paintings</h3>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm mb-4">
                      This material is used in the following paintings:
                    </p>
                    {/* Placeholder for paintings using this material - would need additional API */}
                    <p className="text-center text-muted-foreground py-4">
                      No painting relationships available in this view. 
                      Use the full Material Details page to see related paintings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
} 