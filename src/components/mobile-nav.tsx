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
    { href: "/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-between items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href === "/settings" && (pathname.includes('/auto-fetch') || pathname.includes('/data-tables')));
            
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? "text-blue-600" : "text-gray-500"
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 