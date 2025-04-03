'use client';

import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// Create context for Supabase client
type SupabaseContextType = {
  supabase: typeof supabase;
  session: Session | null;
} | null;

const SupabaseContext = createContext<SupabaseContextType>(null);

// Hook to use Supabase client
export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}

// Provider component
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SupabaseProvider>
        {children}
      </SupabaseProvider>
      <Toaster />
    </>
  );
}

function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
} 