"use client";

import type { Editor } from "@tiptap/react";

export function EditorStatusBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const characters = editor.storage.characterCount?.characters() ?? 0;
  const words = editor.storage.characterCount?.words() ?? 0;
  const { from, to } = editor.state.selection;
  const selectionLength = to - from;

  return (
    <div className="text-muted-foreground flex items-center gap-4 px-1 text-xs">
      <span>{words.toLocaleString()} words</span>
      <span>{characters.toLocaleString()} characters</span>
      {selectionLength > 0 && <span>{selectionLength} selected</span>}
    </div>
  );
}
