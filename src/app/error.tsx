'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-full max-w-md">
        <div className="p-6 bg-white border border-red-100 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Something went wrong</h2>
          <p className="mb-4 text-slate-600">
            An unexpected error occurred while rendering this page.
          </p>
          <div className="mb-6 p-4 bg-red-50 rounded border border-red-200 text-sm text-red-800 font-mono overflow-auto max-h-40 text-left">
            {error.message || 'Unknown error occurred'}
            {error.digest && <p className="mt-2 text-xs text-red-500">Error ID: {error.digest}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => reset()}
              variant="destructive"
            >
              Try again
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 