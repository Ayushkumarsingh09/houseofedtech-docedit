"use client";

import type { Editor } from "@tiptap/react";
import { CloudOff, History, Search, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppTopbar } from "@/components/layout/app-topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTOSAVE_DEBOUNCE_MS } from "@/constants";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { AiAssistMenu } from "@/features/ai/components/ai-assist-menu";
import { CollaboratorsDialog } from "@/features/documents/components/collaborators-dialog";
import { EditorStatusBar } from "@/features/editor/components/editor-status-bar";
import { EditorToolbar } from "@/features/editor/components/editor-toolbar";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/features/editor/components/rich-text-editor";
import { SearchReplacePanel } from "@/features/editor/components/search-replace-panel";
import { useDocumentSync } from "@/features/editor/hooks/use-document-sync";
import { VersionHistoryDialog } from "@/features/versions/components/version-history-dialog";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { syncEngine } from "@/lib/sync-engine/sync-engine";

export default function DocumentEditorPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const { user } = useAuth();
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  const editorRef = useRef<RichTextEditorHandle>(null);
  const lastSyncedContentRef = useRef<string>("");
  const hydratedDocIdRef = useRef<string | null>(null);

  const { localDoc, isLoading, notFoundOffline, recordChange, recordRename } =
    useDocumentSync({
      documentId,
      userId: user?.id ?? "",
    });

  const canEdit = localDoc
    ? localDoc.role === "OWNER" || localDoc.role === "EDITOR"
    : false;
  const isOwner = localDoc?.role === "OWNER";

  useEffect(() => {
    if (localDoc && hydratedDocIdRef.current !== localDoc.id) {
      hydratedDocIdRef.current = localDoc.id;
      lastSyncedContentRef.current = localDoc.content;
      editorRef.current?.setContent(localDoc.content);
    }
  }, [localDoc]);

  useEffect(() => {
    return syncEngine.onRemoteUpdate((docId, content) => {
      if (docId !== documentId) return;
      if (editorInstance?.isFocused) return; // never clobber active typing
      lastSyncedContentRef.current = content;
      editorRef.current?.setContent(content);
    });
  }, [documentId, editorInstance]);

  const debouncedRecordChange = useDebouncedCallback((next: string) => {
    const previous = lastSyncedContentRef.current;
    lastSyncedContentRef.current = next;
    void recordChange(previous, next);
  }, AUTOSAVE_DEBOUNCE_MS);

  const handleUpdate = useCallback(
    (html: string) => {
      debouncedRecordChange(html);
    },
    [debouncedRecordChange],
  );

  const debouncedRename = useDebouncedCallback((title: string) => {
    void recordRename(title);
  }, AUTOSAVE_DEBOUNCE_MS);

  useKeyboardShortcut({
    key: "f",
    meta: true,
    enabled: Boolean(editorInstance),
    handler: () => setSearchOpen(true),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (notFoundOffline) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <CloudOff className="text-muted-foreground size-10" />
        <h2 className="text-lg font-semibold">
          This document isn&apos;t available offline yet
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          You&apos;ll need to open it once while connected so it can be cached locally.
        </p>
      </div>
    );
  }

  if (!localDoc) return null;

  return (
    <>
      <AppTopbar>
        <Input
          value={titleDraft ?? localDoc.title}
          disabled={!canEdit}
          onChange={(e) => {
            setTitleDraft(e.target.value);
            debouncedRename(e.target.value);
          }}
          placeholder="Untitled document"
          aria-label="Document title"
          className="h-8 max-w-sm border-none bg-transparent px-1 text-base font-semibold shadow-none focus-visible:ring-1"
        />
      </AppTopbar>

      <div className="relative flex flex-1 flex-col">
        <div className="border-border bg-card/60 sticky top-16 z-20 flex items-center justify-between gap-2 border-b px-4 py-2 backdrop-blur-md">
          <EditorToolbar editor={editorInstance} />
          <div className="flex shrink-0 items-center gap-2">
            <AiAssistMenu editor={editorInstance} documentId={documentId} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Find and replace"
            >
              <Search className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryOpen(true)}
              aria-label="Version history"
            >
              <History className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollaboratorsOpen(true)}
              aria-label="Share document"
            >
              <Users className="size-4" />
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          {searchOpen && editorInstance && (
            <SearchReplacePanel
              editor={editorInstance}
              onClose={() => setSearchOpen(false)}
            />
          )}
          <RichTextEditor
            ref={editorRef}
            initialContent={localDoc.content}
            editable={canEdit}
            onUpdate={handleUpdate}
            onSelectionUpdate={setEditorInstance}
            onReady={setEditorInstance}
          />
        </div>

        <div className="border-border bg-background/80 sticky bottom-0 flex items-center justify-between border-t px-6 py-2 backdrop-blur-md">
          <EditorStatusBar editor={editorInstance} />
        </div>
      </div>

      <VersionHistoryDialog
        documentId={documentId}
        currentContent={localDoc.content}
        canEdit={canEdit}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestored={(content) => {
          lastSyncedContentRef.current = content;
          editorRef.current?.setContent(content);
        }}
      />
      <CollaboratorsDialog
        documentId={documentId}
        isOwner={Boolean(isOwner)}
        open={collaboratorsOpen}
        onOpenChange={setCollaboratorsOpen}
      />
    </>
  );
}
