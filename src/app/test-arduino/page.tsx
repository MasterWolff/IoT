'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestArduinoPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testArduinoData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-arduino-data');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test Arduino data');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error testing Arduino data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Test Arduino Data</h1>
      
      <div className="mb-6">
        <Button 
          onClick={testArduinoData} 
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Arduino Data Integration'}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      
      {result && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p><strong>Success:</strong> {result.message}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Original Arduino Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[300px]">
                {JSON.stringify(result.original_data, null, 2)}
              </pre>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Mapped Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[300px]">
                {JSON.stringify(result.mapped_data, null, 2)}
              </pre>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Saved Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[300px]">
                {JSON.stringify(result.saved_data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 