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

export default function MaterialsPage() {
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">Material</TableHead>
                  <TableHead>Temperature Range (°C)</TableHead>
                  <TableHead>Humidity Range (%)</TableHead>
                  <TableHead>Light Range (lux)</TableHead>
                  <TableHead>CO₂ Range (ppm)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Oil paint</TableCell>
                  <TableCell>18-22</TableCell>
                  <TableCell>40-65</TableCell>
                  <TableCell>150-200</TableCell>
                  <TableCell>400-1000</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="flex items-center">
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
                <TableRow>
                  <TableCell className="font-medium">Canvas</TableCell>
                  <TableCell>18-22</TableCell>
                  <TableCell>45-55</TableCell>
                  <TableCell>150-180</TableCell>
                  <TableCell>400-800</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="flex items-center">
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
                <TableRow>
                  <TableCell className="font-medium">Watercolor</TableCell>
                  <TableCell>18-21</TableCell>
                  <TableCell>40-60</TableCell>
                  <TableCell>50-150</TableCell>
                  <TableCell>400-1000</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="flex items-center">
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
                <TableRow>
                  <TableCell className="font-medium">Acrylic paint</TableCell>
                  <TableCell>16-24</TableCell>
                  <TableCell>35-65</TableCell>
                  <TableCell>150-200</TableCell>
                  <TableCell>400-1200</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="flex items-center">
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
                <TableRow>
                  <TableCell className="font-medium">Wood panel</TableCell>
                  <TableCell>18-22</TableCell>
                  <TableCell>40-60</TableCell>
                  <TableCell>150-180</TableCell>
                  <TableCell>400-1000</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="flex items-center">
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
                <TableRow>
                  <TableCell className="font-medium">Paper</TableCell>
                  <TableCell>18-21</TableCell>
                  <TableCell>40-50</TableCell>
                  <TableCell>50-120</TableCell>
                  <TableCell>400-800</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="flex items-center">
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
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Material Detail</h2>
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Oil paint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Environmental Thresholds</h3>
                <div className="space-y-3 rounded-lg border p-4 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Temperature</span>
                    <Badge variant="outline" className="font-mono">18-22 °C</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Humidity</span>
                    <Badge variant="outline" className="font-mono">40-65 %</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Light Level</span>
                    <Badge variant="outline" className="font-mono">150-200 lux</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">CO₂ Concentration</span>
                    <Badge variant="outline" className="font-mono">400-1000 ppm</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Max Air Pressure Change</span>
                    <Badge variant="outline" className="font-mono">2 hPa/hr</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Mold Risk Level</span>
                    <Badge variant="outline" className="font-mono">0-2</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Associated Paintings</h3>
                <div className="space-y-3 rounded-lg border p-4 bg-slate-50">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium">Sunflowers</span>
                    <Badge variant="destructive">Alert</Badge>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium">The Night Watch</span>
                    <Badge variant="destructive">Alert</Badge>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium">Water Lilies</span>
                    <Badge variant="destructive">Alert</Badge>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium">The Persistence of Memory</span>
                    <Badge variant="secondary">Normal</Badge>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium">Girl with a Pearl Earring</span>
                    <Badge variant="secondary">Normal</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 