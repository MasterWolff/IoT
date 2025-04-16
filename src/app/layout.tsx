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
    <html lang="en" style={{ height: '100%' }}>
      <head>
        {/* Base styles in case CSS fails to load */}
        <style dangerouslySetInnerHTML={{ __html: `
          body { 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc;
            color: #0f172a;
            font-family: sans-serif;
          }
          .header { 
            border-bottom: 1px solid #e2e8f0; 
            background-color: white;
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
          }
          .link-item {
            font-size: 0.875rem;
            font-weight: 500;
            margin-right: 1.5rem;
            color: #475569;
          }
          .link-item:hover {
            color: #2563eb;
          }
          .card {
            background-color: white;
            border-radius: 0.5rem;
            border: 1px solid #e2e8f0;
            padding: 1rem;
            margin-bottom: 1rem;
          }
        `}} />
      </head>
      <body className={inter.className} style={{ height: '100%', backgroundColor: '#f8fafc', margin: 0, padding: 0 }}>
        <Providers>
          {/* Initialize auto-fetch service */}
          <AutoFetchInit />
          <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            <header className="header" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', paddingBottom: '1rem' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem', borderRadius: '0.375rem' }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ height: '1.25rem', width: '1.25rem' }}
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
                  <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>Museum IoT</span>
                </Link>
                <nav style={{ display: 'flex', alignItems: 'center' }}>
                  <Link 
                    href="/" 
                    className="link-item"
                    style={{ fontSize: '0.875rem', fontWeight: '500', marginRight: '1.5rem', color: '#475569', textDecoration: 'none' }}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/paintings" 
                    className="link-item"
                    style={{ fontSize: '0.875rem', fontWeight: '500', marginRight: '1.5rem', color: '#475569', textDecoration: 'none' }}
                  >
                    Paintings
                  </Link>
                  <Link 
                    href="/devices" 
                    className="link-item"
                    style={{ fontSize: '0.875rem', fontWeight: '500', marginRight: '1.5rem', color: '#475569', textDecoration: 'none' }}
                  >
                    Devices
                  </Link>
                  <Link 
                    href="/materials" 
                    className="link-item"
                    style={{ fontSize: '0.875rem', fontWeight: '500', marginRight: '1.5rem', color: '#475569', textDecoration: 'none' }}
                  >
                    Materials
                  </Link>
                  <Link 
                    href="/auto-fetch" 
                    className="link-item"
                    style={{ fontSize: '0.875rem', fontWeight: '500', marginRight: '1.5rem', color: '#475569', textDecoration: 'none' }}
                  >
                    Auto Fetch
                  </Link>
                  <Link 
                    href="/data-tables" 
                    className="link-item"
                    style={{ fontSize: '0.875rem', fontWeight: '500', marginRight: '1.5rem', color: '#475569', textDecoration: 'none' }}
                  >
                    Data Tables
                  </Link>
                </nav>
              </div>
            </header>
            <main style={{ flex: '1', paddingTop: '2rem', paddingBottom: '2rem' }}>
              <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>
            <footer style={{ borderTop: '1px solid #e2e8f0', backgroundColor: 'white', padding: '1.5rem 0' }}>
              <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '0 1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                © {new Date().getFullYear()} Museum IoT Monitoring System
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
