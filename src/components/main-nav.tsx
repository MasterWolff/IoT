import Link from "next/link";

import { cn } from "@/lib/utils";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Dashboard
      </Link>
      <Link
        href="/paintings"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Paintings
      </Link>
      <Link
        href="/devices"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Devices
      </Link>
      <Link
        href="/materials"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Materials
      </Link>
      <Link
        href="/monitor"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Arduino Monitor
      </Link>
      <Link
        href="/auto-fetch"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Auto Fetch
      </Link>
    </nav>
  );
} 