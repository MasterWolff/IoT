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

export default function PaintingsPage() {
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
                <TableRow>
                  <TableCell className="font-medium">Sunflowers</TableCell>
                  <TableCell>Vincent van Gogh</TableCell>
                  <TableCell>1888</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline">Oil paint</Badge>
                      <Badge variant="outline">Canvas</Badge>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="destructive">Alert</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">The Night Watch</TableCell>
                  <TableCell>Rembrandt</TableCell>
                  <TableCell>1642</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline">Oil paint</Badge>
                      <Badge variant="outline">Canvas</Badge>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="destructive">Alert</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Water Lilies</TableCell>
                  <TableCell>Claude Monet</TableCell>
                  <TableCell>1919</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline">Oil paint</Badge>
                      <Badge variant="outline">Canvas</Badge>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="destructive">Alert</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">The Persistence of Memory</TableCell>
                  <TableCell>Salvador Dalí</TableCell>
                  <TableCell>1931</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline">Oil paint</Badge>
                      <Badge variant="outline">Canvas</Badge>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">Normal</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Girl with a Pearl Earring</TableCell>
                  <TableCell>Johannes Vermeer</TableCell>
                  <TableCell>1665</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline">Oil paint</Badge>
                      <Badge variant="outline">Canvas</Badge>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">Normal</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
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