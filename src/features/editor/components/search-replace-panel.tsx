"use client";

import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, Replace, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Match {
  from: number;
  to: number;
}

function findMatches(editor: Editor, query: string): Match[] {
  if (!query) return [];
  const matches: Match[] = [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "gi");

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(node.text))) {
      matches.push({ from: pos + match.index, to: pos + match.index + match[0].length });
    }
  });

  return matches;
}

export function SearchReplacePanel({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => findMatches(editor, query), [editor, query]);

  function goTo(index: number) {
    if (matches.length === 0) return;
    const wrapped = ((index % matches.length) + matches.length) % matches.length;
    setActiveIndex(wrapped);
    const match = matches[wrapped];
    if (!match) return;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .scrollIntoView()
      .run();
  }

  function replaceCurrent() {
    if (matches.length === 0) return;
    const match = matches[activeIndex];
    if (!match) return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: match.from, to: match.to }, replacement)
      .run();
  }

  function replaceAll() {
    if (!query) return;
    [...matches].reverse().forEach((match) => {
      editor
        .chain()
        .insertContentAt({ from: match.from, to: match.to }, replacement)
        .run();
    });
  }

  return (
    <div className="border-border bg-card animate-slide-up absolute top-2 right-4 z-20 flex flex-col gap-2 rounded-lg border p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          placeholder="Find…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") goTo(activeIndex + (e.shiftKey ? -1 : 1));
            if (e.key === "Escape") onClose();
          }}
          className="h-8 w-48"
        />
        <span className="text-muted-foreground w-14 shrink-0 text-xs">
          {matches.length > 0 ? `${activeIndex + 1}/${matches.length}` : "0/0"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => goTo(activeIndex - 1)}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => goTo(activeIndex + 1)}
        >
          <ChevronDown className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Replace with…"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          className="h-8 w-48"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={replaceCurrent}
          disabled={matches.length === 0}
        >
          <Replace className="size-3.5" /> Replace
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={replaceAll}
          disabled={matches.length === 0}
        >
          All
        </Button>
      </div>
    </div>
  );
}
