'use client';

import { useEffect } from 'react';
import { subscribeToDataUpdates } from '@/lib/autoFetchService';

interface DashboardRefresherProps {
  onDataUpdate: () => void;
}

/**
 * Invisible component that subscribes to data updates from the auto-fetch service
 * and triggers a refresh when new data is available.
 * Can be used on any page that needs to refresh when new sensor data is fetched.
 */
export default function DashboardRefresher({ onDataUpdate }: DashboardRefresherProps) {
  useEffect(() => {
    // Subscribe to data updates
    const unsubscribe = subscribeToDataUpdates(() => {
      console.log('Data update received - refreshing data');
      onDataUpdate();
    });
    
    // Cleanup subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, [onDataUpdate]);
  
  // This component doesn't render anything
  return null;
} 