import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";
import AutoFetchInit from "@/components/AutoFetchInit";
import dynamic from 'next/dynamic';

// Import ErrorBoundary with no SSR to avoid hydration issues
const ErrorBoundary = dynamic(() => import('@/components/ErrorBoundary'), { 
  ssr: false 
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Museum IoT Monitoring",
  description: "Museum IoT environmental monitoring system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head />
      <body className={`${inter.className} h-full bg-background m-0 p-0`}>
        <Providers>
          {/* Initialize auto-fetch service */}
          <AutoFetchInit />
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
                <Link href="/" className="flex items-center gap-2 text-inherit no-underline">
                  <div className="rounded bg-blue-600 p-2 text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
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
                <nav className="flex items-center">
                  <Link 
                    href="/" 
                    className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/paintings" 
                    className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline"
                  >
                    Paintings
                  </Link>
                  <Link 
                    href="/devices" 
                    className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline"
                  >
                    Devices
                  </Link>
                  <Link 
                    href="/materials" 
                    className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline"
                  >
                    Materials
                  </Link>
                  <Link 
                    href="/auto-fetch" 
                    className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline"
                  >
                    Auto Fetch
                  </Link>
                  <Link 
                    href="/data-tables" 
                    className="mr-6 text-sm font-medium text-gray-600 hover:text-blue-600 no-underline"
                  >
                    Data Tables
                  </Link>
                </nav>
              </div>
            </header>
            <main className="flex-1 py-8">
              <div className="mx-auto w-full max-w-7xl px-4">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>
            <footer className="border-t border-gray-200 bg-white py-6">
              <div className="mx-auto w-full max-w-7xl px-4 text-center text-sm text-gray-500">
                © {new Date().getFullYear()} Museum IoT Monitoring System
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
