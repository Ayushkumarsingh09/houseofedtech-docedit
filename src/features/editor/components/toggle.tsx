"use client";

import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToggleProps {
  pressed: boolean;
  onPressedChange: () => void;
  label: string;
  children: ReactNode;
}

export function Toggle({ pressed, onPressedChange, label, children }: ToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={pressed}
          aria-label={label}
          onClick={onPressedChange}
          className={cn(
            "hover:bg-accent flex size-8 items-center justify-center rounded-md transition-colors",
            pressed && "bg-primary/10 text-primary",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
