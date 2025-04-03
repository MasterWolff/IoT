import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";

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
      <body className={`${inter.className} h-full bg-slate-50`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="border-b bg-white sticky top-0 z-10 shadow-sm">
              <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between py-4">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="bg-blue-600 text-white p-2 rounded-md">
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
                <nav className="flex items-center space-x-6">
                  <Link 
                    href="/" 
                    className="text-sm font-medium hover:text-blue-600 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/paintings" 
                    className="text-sm font-medium hover:text-blue-600 transition-colors"
                  >
                    Paintings
                  </Link>
                  <Link 
                    href="/devices" 
                    className="text-sm font-medium hover:text-blue-600 transition-colors"
                  >
                    Devices
                  </Link>
                  <Link 
                    href="/materials" 
                    className="text-sm font-medium hover:text-blue-600 transition-colors"
                  >
                    Materials
                  </Link>
                  <Link 
                    href="/test-arduino" 
                    className="text-sm font-medium hover:text-blue-600 transition-colors"
                  >
                    Test Arduino
                  </Link>
                </nav>
              </div>
            </header>
            <main className="flex-1 py-8">
              <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
                {children}
              </div>
            </main>
            <footer className="border-t bg-white py-6">
              <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 text-center text-sm text-slate-500">
                © {new Date().getFullYear()} Museum IoT Monitoring System
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
