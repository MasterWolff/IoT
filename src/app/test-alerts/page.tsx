'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  ClockIcon, 
  CheckCircle2, 
  XCircle, 
  MailIcon, 
  MailCheckIcon,
  PlayIcon,
  SquareIcon,
  RefreshCwIcon
} from 'lucide-react';

interface TestResult {
  success: boolean;
  timestamp: string;
  processed: number;
  successful: number;
  failed: number;
  alertsChecked: boolean;
  alertsFound: number;
  emailsSent: number;
  results: {
    success: any[];
    errors: { deviceId: string, error: string }[];
  }
}

export default function TestAlertsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [totalFetches, setTotalFetches] = useState(0);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Fetch data from the test API
  const fetchData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/test-alerts');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch data: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      setResults(data);
      setHistory(prev => [data, ...prev].slice(0, 20)); // Keep last 20 entries
      setLastRun(new Date().toLocaleTimeString());
      setTotalFetches(prev => prev + 1);
      setTotalAlerts(prev => prev + (data.alertsFound || 0));
      setTotalEmails(prev => prev + (data.emailsSent || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching test data:', err);
    }
  };

  // Start the automatic fetching
  const startFetching = () => {
    if (isRunning) return;
    
    // Initial fetch
    fetchData();
    
    // Set up interval for subsequent fetches
    const id = setInterval(fetchData, 5000); // 5 seconds
    setIntervalId(id);
    setIsRunning(true);
  };

  // Stop the automatic fetching
  const stopFetching = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Test Alert System</h1>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Control Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {isRunning ? (
              <Button 
                variant="destructive" 
                onClick={stopFetching}
                className="flex items-center gap-2"
              >
                <SquareIcon className="h-4 w-4" />
                Stop Data Fetching
              </Button>
            ) : (
              <Button 
                onClick={startFetching}
                className="flex items-center gap-2"
              >
                <PlayIcon className="h-4 w-4" />
                Start Data Fetching (5s interval)
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={fetchData}
              className="flex items-center gap-2"
              disabled={isRunning}
            >
              <RefreshCwIcon className="h-4 w-4" />
              Fetch Once
            </Button>
            
            {isRunning && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                <span>Auto-fetching every 5 seconds</span>
              </div>
            )}
            
            {lastRun && (
              <div className="text-sm text-muted-foreground">
                Last run: {lastRun}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Total Fetches</div>
              <RefreshCwIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mt-2">{totalFetches}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Alerts Detected</div>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold mt-2 text-amber-500">{totalAlerts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Emails Sent</div>
              <MailIcon className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold mt-2 text-blue-500">{totalEmails}</div>
          </CardContent>
        </Card>
      </div>
      
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-700">Error</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {results && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Latest Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Timestamp</div>
                <div className="font-medium">{new Date(results.timestamp).toLocaleString()}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Devices Processed</div>
                <div className="font-medium">{results.processed}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Alerts Found</div>
                <div className="font-medium flex items-center gap-1">
                  {results.alertsFound}
                  {results.alertsFound > 0 && <AlertCircle className="h-4 w-4 text-amber-500" />}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Emails Sent</div>
                <div className="font-medium flex items-center gap-1">
                  {results.emailsSent}
                  {results.emailsSent > 0 && <MailCheckIcon className="h-4 w-4 text-blue-500" />}
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="success">
              <TabsList>
                <TabsTrigger value="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Success ({results.results.success.length})
                </TabsTrigger>
                <TabsTrigger value="errors" className="flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Errors ({results.results.errors.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="success" className="mt-4">
                {results.results.success.length > 0 ? (
                  <div className="space-y-2">
                    {results.results.success.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div><strong>Device ID:</strong> {item.deviceId}</div>
                        <div><strong>Arduino Device ID:</strong> {item.arduinoDeviceId}</div>
                        <div><strong>Thing ID:</strong> {item.thingId}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No successful operations</p>
                )}
              </TabsContent>
              
              <TabsContent value="errors" className="mt-4">
                {results.results.errors.length > 0 ? (
                  <div className="space-y-2">
                    {results.results.errors.map((item, index) => (
                      <div key={index} className="p-3 bg-red-50 rounded-lg text-sm">
                        <div><strong>Device ID:</strong> {item.deviceId}</div>
                        <div><strong>Error:</strong> {item.error}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No errors</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(1).map((item, index) => (
                <div key={index} className="text-sm p-2 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      <span>
                        {item.alertsFound > 0 && (
                          <span className="text-amber-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {item.alertsFound} alerts
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.emailsSent > 0 ? (
                        <span className="text-blue-500 flex items-center gap-1">
                          <MailIcon className="h-3 w-3" />
                          {item.emailsSent} emails
                        </span>
                      ) : null}
                      <span className={`flex items-center gap-1 ${item.failed > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.failed > 0 ? (
                          <>
                            <XCircle className="h-3 w-3" />
                            {item.failed} failed
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            {item.successful} OK
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 