'use client';

import { useEffect } from 'react';
import { initializeTimers } from './autoFetchService';

// React component that initializes the auto-fetch service
export default function AutoFetchInitializer() {
  useEffect(() => {
    // Initialize timers
    initializeTimers();
    
    // No cleanup function to allow timers to continue running
  }, []);
  
  // This component doesn't render anything
  return null;
} 