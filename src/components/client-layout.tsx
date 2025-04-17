'use client';

import Link from "next/link";
import AutoFetchInit from "@/components/AutoFetchInit";
import dynamic from 'next/dynamic';
import React from 'react';
import { 
  LayoutDashboard, 
  Frame, 
  Cpu, 
  Layers,
  Settings,
  Download,
  Database
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import ErrorBoundary with no SSR to avoid hydration issues
const ErrorBoundary = dynamic(() => import('@/components/ErrorBoundary'), { 
  ssr: false 
});

// Create a separate mobile navigation component file
const MobileNav = dynamic(() => import('@/components/mobile-nav'), { ssr: false });

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Initialize auto-fetch service */}
      <AutoFetchInit />
      <div className="min-h-screen flex flex-col">
        {/* Desktop header - hidden on mobile */}
        <div className="w-full bg-white border-b border-gray-200 shadow-sm print:hidden hidden md:block">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-inherit no-underline">
              <div className="rounded bg-blue-600 p-2 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M2 12h5" />
                  <path d="M17 12h5" />
                  <path d="M12 2v5" />
                  <path d="M12 17v5" />
                  <path d="M4.93 4.93l3.54 3.54" />
                  <path d="M15.54 15.54l3.54 3.54" />
                  <path d="M15.54 4.93l-3.54 3.54" />
                  <path d="M4.93 15.54l3.54-3.54" />
                </svg>
              </div>
              <span className="text-xl font-bold">Museum IoT</span>
            </Link>
            
            <div className="flex items-center force-visible">
              <Link href="/" className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link href="/paintings" className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline flex items-center gap-1.5">
                <Frame className="h-4 w-4" />
                <span>Paintings</span>
              </Link>
              <Link href="/devices" className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline flex items-center gap-1.5">
                <Cpu className="h-4 w-4" />
                <span>Devices</span>
              </Link>
              <Link href="/materials" className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>Materials</span>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Link href="/auto-fetch" className="w-full text-inherit no-underline flex items-center gap-1.5">
                      <Download className="h-4 w-4 text-blue-600" />
                      <span>Auto Fetch</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/data-tables" className="w-full text-inherit no-underline flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-purple-600" />
                      <span>Data Tables</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile header - only show logo */}
        <div className="w-full bg-white border-b border-gray-200 shadow-sm print:hidden md:hidden">
          <div className="px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-inherit no-underline">
              <div className="rounded bg-blue-600 p-2 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M2 12h5" />
                  <path d="M17 12h5" />
                  <path d="M12 2v5" />
                  <path d="M12 17v5" />
                  <path d="M4.93 4.93l3.54 3.54" />
                  <path d="M15.54 15.54l3.54 3.54" />
                  <path d="M15.54 4.93l-3.54 3.54" />
                  <path d="M4.93 15.54l3.54-3.54" />
                </svg>
              </div>
              <span className="text-xl font-bold">Museum IoT</span>
            </Link>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 py-6 pb-20 md:pb-6">
          <div className="container mx-auto px-4">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <MobileNav />
        
        <footer className="border-t border-gray-200 bg-white py-6 hidden md:block">
          <div className="mx-auto w-full max-w-7xl px-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Museum IoT Monitoring System
          </div>
        </footer>
      </div>
    </>
  );
} 