"use client";

import { FilePlus, FileText, LayoutDashboard, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  useCreateDocument,
  useDocuments,
} from "@/features/documents/hooks/use-documents";
import { useUiStore } from "@/stores/ui-store";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { data: documents } = useDocuments();
  const createDocument = useCreateDocument();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  function runAndClose(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search documents or run a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              runAndClose(() => createDocument.mutate({ title: "Untitled document" }))
            }
          >
            <FilePlus /> New document
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => router.push("/dashboard"))}>
            <LayoutDashboard /> Go to dashboard
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => router.push("/settings"))}>
            <Settings /> Go to settings
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAndClose(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />} Toggle theme
          </CommandItem>
        </CommandGroup>
        {documents && documents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
              {documents.slice(0, 8).map((doc) => (
                <CommandItem
                  key={doc.id}
                  value={doc.title || "Untitled document"}
                  onSelect={() => runAndClose(() => router.push(`/documents/${doc.id}`))}
                >
                  <FileText /> {doc.title || "Untitled document"}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
