'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Frame, 
  Cpu, 
  Layers, 
  Settings
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/paintings", label: "Paintings", icon: <Frame className="h-5 w-5" /> },
    { href: "/devices", label: "Devices", icon: <Cpu className="h-5 w-5" /> },
    { href: "/materials", label: "Materials", icon: <Layers className="h-5 w-5" /> },
    // Combined settings page that will show Auto Fetch and Data Tables
    { 
      href: pathname.includes('/auto-fetch') || pathname.includes('/data-tables') 
        ? pathname // Keep current path if already in settings section
        : "/settings", 
      label: "Settings", 
      icon: <Settings className="h-5 w-5" /> 
    },
  ];

  // Determine if the current path is in a settings-related section
  const isSettingsActive = pathname.includes('/auto-fetch') || pathname.includes('/data-tables');

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          // Special handling for settings to highlight it when in settings-related pages
          const isActive = item.label === "Settings" 
            ? isSettingsActive 
            : pathname === item.href;
            
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full no-underline ${
                isActive ? "text-blue-600" : "text-gray-600"
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 