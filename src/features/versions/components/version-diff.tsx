"use client";

import { diffWords } from "diff";
import { useMemo } from "react";

import { stripHtml } from "@/lib/sanitize";

export function VersionDiff({ before, after }: { before: string; after: string }) {
  const parts = useMemo(
    () => diffWords(stripHtml(before), stripHtml(after)),
    [before, after],
  );

  return (
    <div className="bg-muted/40 max-h-[50vh] scrollbar-thin overflow-y-auto rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, index) => (
        <span
          key={index}
          className={
            part.added
              ? "bg-success/20 text-success rounded px-0.5"
              : part.removed
                ? "bg-destructive/20 text-destructive rounded px-0.5 line-through"
                : undefined
          }
        >
          {part.value}
        </span>
      ))}
    </div>
  );
}
