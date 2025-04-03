import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Type definition for our data item
export type DataItem = {
  id: string | number;
  timestamp: string;
  data: any;
};

// Type definition for auto-fetch state
interface AutoFetchState {
  // Configuration
  isRunning: boolean;
  isPaused: boolean;
  duration: number; // in minutes
  interval: number; // in seconds
  timeRemaining: number; // in seconds
  
  // Statistics
  fetchCount: number;
  successCount: number;
  errorCount: number;
  lastFetchTime: string | null;
  nextFetchTime: string | null;
  statusMessage: string;
  recentData: DataItem[];
  
  // Actions
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  fetchData: () => Promise<void>;
  setDuration: (duration: number) => void;
  setInterval: (interval: number) => void;
  decrementTimeRemaining: () => void;
  setLastFetchTime: (time: Date) => void;
  setNextFetchTime: (time: Date) => void;
}

// Create the store with persistence
export const useAutoFetchStore = create<AutoFetchState>()(
  persist(
    (set, get) => ({
      // Initial state
      isRunning: false,
      isPaused: false,
      duration: 5,
      interval: 5,
      timeRemaining: 0,
      fetchCount: 0,
      successCount: 0,
      errorCount: 0,
      lastFetchTime: null,
      nextFetchTime: null,
      statusMessage: 'Ready to start',
      recentData: [],
      
      // Actions
      start: () => {
        const { duration, fetchData } = get();
        set({
          isRunning: true,
          isPaused: false,
          timeRemaining: duration * 60,
          fetchCount: 0,
          successCount: 0,
          errorCount: 0,
          lastFetchTime: null,
          recentData: [],
          statusMessage: 'Starting data collection...'
        });
        
        // Fetch data immediately
        fetchData();
      },
      
      stop: () => {
        set({
          isRunning: false,
          isPaused: false,
          timeRemaining: 0,
          nextFetchTime: null,
          statusMessage: 'Data collection stopped'
        });
      },
      
      pause: () => {
        const isPaused = get().isPaused;
        set({ 
          isPaused: !isPaused,
          statusMessage: !isPaused ? 'Data collection paused' : 'Data collection resumed',
          nextFetchTime: isPaused ? new Date(Date.now() + get().interval * 1000).toISOString() : null
        });
      },
      
      resume: () => {
        set({ 
          isPaused: false,
          statusMessage: 'Data collection resumed',
          nextFetchTime: new Date(Date.now() + get().interval * 1000).toISOString()
        });
      },
      
      fetchData: async () => {
        const {
          isRunning,
          isPaused,
          interval
        } = get();
        
        // If not running or paused, don't fetch
        if (!isRunning || isPaused) return;
        
        try {
          set({ 
            statusMessage: 'Generating test sensor data...',
            lastFetchTime: new Date().toISOString(),
            fetchCount: get().fetchCount + 1
          });
          
          // Fetch data directly from the test endpoint
          const response = await fetch('/api/test-arduino-data');
          const data = await response.json();
          
          if (data.success) {
            set({ 
              successCount: get().successCount + 1,
              statusMessage: 'Successfully saved test sensor data',
            });
            
            // Create a new data item
            const newItem: DataItem = {
              id: new Date().getTime(),
              timestamp: new Date().toISOString(),
              data: data.saved_data
            };
            
            // Update recent data
            const currentData = get().recentData;
            set({
              recentData: [newItem, ...currentData].slice(0, 10)
            });
            
            // Schedule next fetch
            if (isRunning && !isPaused) {
              const nextTime = new Date(Date.now() + interval * 1000);
              set({ nextFetchTime: nextTime.toISOString() });
            }
          } else {
            set({ 
              errorCount: get().errorCount + 1,
              statusMessage: `Error: ${data.error || 'Failed to generate test data'}`
            });
          }
        } catch (error) {
          set({ 
            errorCount: get().errorCount + 1,
            statusMessage: `Error: ${error instanceof Error ? error.message : 'Failed to generate test data'}`
          });
          console.error('Error generating test data:', error);
        }
      },
      
      setDuration: (duration: number) => set({ duration }),
      
      setInterval: (interval: number) => set({ interval }),
      
      decrementTimeRemaining: () => {
        const { timeRemaining, isRunning, isPaused, stop } = get();
        if (isRunning && !isPaused && timeRemaining > 0) {
          set({ timeRemaining: timeRemaining - 1 });
        } else if (isRunning && timeRemaining <= 0) {
          stop();
        }
      },
      
      setLastFetchTime: (time: Date) => set({ lastFetchTime: time.toISOString() }),
      
      setNextFetchTime: (time: Date) => set({ nextFetchTime: time.toISOString() })
    }),
    {
      name: 'auto-fetch-storage', // Name for localStorage
      partialize: (state) => ({
        // Only persist these fields
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        duration: state.duration,
        interval: state.interval,
        timeRemaining: state.timeRemaining,
        fetchCount: state.fetchCount,
        successCount: state.successCount,
        errorCount: state.errorCount,
        lastFetchTime: state.lastFetchTime,
        statusMessage: state.statusMessage,
        recentData: state.recentData,
      }),
    }
  )
);

// Utility functions
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return 'N/A';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  } catch (error) {
    return 'Invalid time';
  }
}

// Global timers
let timerInterval: NodeJS.Timeout | null = null;
let fetchInterval: NodeJS.Timeout | null = null;

// Initialize timers if we already have a running state
export function initializeTimers() {
  const state = useAutoFetchStore.getState();
  
  // Clear any existing intervals first
  if (timerInterval) clearInterval(timerInterval);
  if (fetchInterval) clearInterval(fetchInterval);
  
  // Start the timer if we're running
  if (state.isRunning && !state.isPaused) {
    // Timer for counting down
    timerInterval = setInterval(() => {
      useAutoFetchStore.getState().decrementTimeRemaining();
    }, 1000);
    
    // Timer for fetching data
    fetchInterval = setInterval(() => {
      useAutoFetchStore.getState().fetchData();
    }, state.interval * 1000);
  }
}

// Function to start timers
export function startTimers() {
  const state = useAutoFetchStore.getState();
  
  // Clear any existing intervals first
  if (timerInterval) clearInterval(timerInterval);
  if (fetchInterval) clearInterval(fetchInterval);
  
  // Only start if running and not paused
  if (state.isRunning && !state.isPaused) {
    // Timer for counting down
    timerInterval = setInterval(() => {
      useAutoFetchStore.getState().decrementTimeRemaining();
    }, 1000);
    
    // Timer for fetching data
    fetchInterval = setInterval(() => {
      useAutoFetchStore.getState().fetchData();
    }, state.interval * 1000);
  }
}

// Function to stop timers
export function stopTimers() {
  if (timerInterval) clearInterval(timerInterval);
  if (fetchInterval) clearInterval(fetchInterval);
  timerInterval = null;
  fetchInterval = null;
}

// Function to restart timers (e.g., when changing interval)
export function restartTimers() {
  stopTimers();
  startTimers();
} 