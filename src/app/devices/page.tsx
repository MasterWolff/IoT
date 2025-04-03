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
import { PlusCircle, Settings, RefreshCw } from "lucide-react";

export default function DevicesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
        <Button className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Device
        </Button>
      </div>
      
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-001</TableCell>
                  <TableCell>Sunflowers</TableCell>
                  <TableCell>Jan 15, 2024</TableCell>
                  <TableCell>Apr 3, 2024 10:45 AM</TableCell>
                  <TableCell><Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge></TableCell>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-002</TableCell>
                  <TableCell>The Night Watch</TableCell>
                  <TableCell>Feb 20, 2024</TableCell>
                  <TableCell>Apr 3, 2024 10:30 AM</TableCell>
                  <TableCell><Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge></TableCell>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-003</TableCell>
                  <TableCell>Water Lilies</TableCell>
                  <TableCell>Mar 5, 2024</TableCell>
                  <TableCell>Apr 3, 2024 10:40 AM</TableCell>
                  <TableCell><Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge></TableCell>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-004</TableCell>
                  <TableCell>The Persistence of Memory</TableCell>
                  <TableCell>Jan 30, 2024</TableCell>
                  <TableCell>Apr 3, 2024 10:20 AM</TableCell>
                  <TableCell><Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge></TableCell>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-005</TableCell>
                  <TableCell>Girl with a Pearl Earring</TableCell>
                  <TableCell>Feb 10, 2024</TableCell>
                  <TableCell>Apr 3, 2024 10:15 AM</TableCell>
                  <TableCell><Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge></TableCell>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-006</TableCell>
                  <TableCell>Starry Night</TableCell>
                  <TableCell>Mar 15, 2024</TableCell>
                  <TableCell>Apr 2, 2024 5:30 PM</TableCell>
                  <TableCell><Badge variant="destructive">Offline</Badge></TableCell>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-007</TableCell>
                  <TableCell>The Scream</TableCell>
                  <TableCell>Jan 20, 2024</TableCell>
                  <TableCell>Apr 3, 2024 8:00 AM</TableCell>
                  <TableCell><Badge>Maintenance</Badge></TableCell>
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
                <TableRow>
                  <TableCell className="font-medium">DEV-008</TableCell>
                  <TableCell>Guernica</TableCell>
                  <TableCell>Feb 5, 2024</TableCell>
                  <TableCell>Apr 3, 2024 9:15 AM</TableCell>
                  <TableCell><Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge></TableCell>
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
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 