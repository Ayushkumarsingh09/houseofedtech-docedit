"use client";

import type { Editor } from "@tiptap/react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { aiApi } from "@/features/ai/api";

export function AiAssistMenu({
  editor,
  documentId,
}: {
  editor: Editor | null;
  documentId: string;
}) {
  const [pending, setPending] = useState<string | null>(null);

  if (!editor) return null;

  async function run(mode: "summarize" | "continue" | "improve") {
    if (!editor) return;
    setPending(mode);
    try {
      const html = editor.getHTML();
      const result =
        mode === "summarize"
          ? await aiApi.summarize(documentId, html)
          : await aiApi.complete(documentId, html, mode);

      if (!result.text) {
        toast.info("There isn't enough content yet for AI assistance.");
        return;
      }

      if (mode === "summarize") {
        toast.success("Summary", { description: result.text, duration: 12000 });
      } else if (mode === "continue") {
        editor.chain().focus("end").insertContent(`<p>${result.text}</p>`).run();
      } else {
        editor.chain().focus().selectAll().insertContent(`<p>${result.text}</p>`).run();
      }

      if (!result.usedProvider) {
        toast.message("Using built-in AI fallback", {
          description:
            "Add an OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY for model-backed responses.",
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          AI Assist
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("summarize")}>
          <WandSparkles className="size-4" /> Summarize document
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("continue")}>
          <WandSparkles className="size-4" /> Continue writing
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("improve")}>
          <WandSparkles className="size-4" /> Improve clarity
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
