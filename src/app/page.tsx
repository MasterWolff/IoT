import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MeasurementTabs } from "@/components/measurement-tabs";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">Total Paintings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">+2 from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">5 connected today</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">3</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">10.4k</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight mb-2">Active Alerts</h2>
        <div className="grid gap-4">
          <Alert variant="destructive" className="shadow-sm">
            <AlertTitle className="font-semibold">High Humidity Alert</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p><strong>Painting:</strong> Sunflowers by Vincent van Gogh</p>
                <p><strong>Current Level:</strong> 70% (Above threshold of 65%)</p>
                <p><strong>Time:</strong> Last updated 12 minutes ago</p>
              </div>
            </AlertDescription>
          </Alert>
          <Alert variant="destructive" className="shadow-sm">
            <AlertTitle className="font-semibold">Temperature Fluctuation</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p><strong>Painting:</strong> The Night Watch by Rembrandt</p>
                <p><strong>Current Level:</strong> 26°C (Above threshold of 23°C)</p>
                <p><strong>Time:</strong> Last updated 5 minutes ago</p>
              </div>
            </AlertDescription>
          </Alert>
          <Alert variant="destructive" className="shadow-sm">
            <AlertTitle className="font-semibold">High Light Exposure</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p><strong>Painting:</strong> Water Lilies by Claude Monet</p>
                <p><strong>Current Level:</strong> 250 lux (Above threshold of 200 lux)</p>
                <p><strong>Time:</strong> Last updated 30 minutes ago</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </section>
      
      <MeasurementTabs />
    </div>
  );
}
