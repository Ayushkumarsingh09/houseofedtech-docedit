import { Cloud } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
        <Cloud className="size-4" strokeWidth={2.5} />
      </span>
      <span>Nimbus Docs</span>
    </Link>
  );
}
