'use client';

import { useEffect } from 'react';
import { initializeTimers } from '@/lib/autoFetchService';

// Client component for initializing the auto-fetch service
export default function AutoFetchInit() {
  useEffect(() => {
    // Initialize timers
    initializeTimers();
    
    // No cleanup function to allow timers to continue running
  }, []);
  
  // This component doesn't render anything
  return null;
} 