'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Database, Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-gray-700" />
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
      </div>
      
      <p className="text-gray-600 max-w-3xl">
        Configure system settings and access administrative tools for the Museum IoT monitoring system.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Link href="/auto-fetch" className="block no-underline">
          <Card className="h-full hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-full bg-blue-100 p-2">
                <Download className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Auto Fetch</CardTitle>
                <CardDescription>Configure automated data collection</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Set up schedules for automatic data retrieval from IoT devices and manage synchronization settings.
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/data-tables" className="block no-underline">
          <Card className="h-full hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-full bg-purple-100 p-2">
                <Database className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Data Tables</CardTitle>
                <CardDescription>View and manage raw data</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Access database tables, view raw environmental measurements, and manage system data.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
} 