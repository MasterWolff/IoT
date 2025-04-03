'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function DatabaseCleanupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanupDatabase = async () => {
    if (!confirm('Are you sure you want to delete all environmental data? This will also remove all alerts since they are generated from this data. This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cleanup-database', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clean up database');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error cleaning up database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            Database Cleanup
          </CardTitle>
          <CardDescription>
            Use this tool to clean up your database and remove all environmental data and alerts.
            This is useful for starting fresh or removing test data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert variant="warning" className="bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Warning</AlertTitle>
              <AlertDescription className="text-amber-700">
                This action will permanently delete all environmental data readings from the database.
                This will also remove all alerts since they are generated from this data.
                This action cannot be undone, so make sure you have backups if needed.
              </AlertDescription>
            </Alert>
            
            {error && (
              <Alert variant="destructive" className="bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {result && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">
                  Database cleanup completed successfully. All environmental data has been deleted,
                  which will also remove any alerts since they are generated from this data.
                  <ul className="mt-2 list-disc list-inside">
                    <li>Deleted environmental data records: {result.deletedData.environmentalData}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <Button 
            variant="destructive" 
            onClick={cleanupDatabase} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isLoading ? 'Cleaning...' : 'Clean Database'}
          </Button>
          
          <Link href="/data-tables" className="text-sm text-blue-600 hover:text-blue-800">
            View Data Tables
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 