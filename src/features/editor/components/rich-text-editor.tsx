"use client";

import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import CharacterCount from "@tiptap/extension-character-count";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useImperativeHandle, useRef } from "react";

export interface RichTextEditorHandle {
  getEditor: () => Editor | null;
  setContent: (html: string) => void;
}

interface RichTextEditorProps {
  initialContent: string;
  editable: boolean;
  onUpdate: (html: string) => void;
  onSelectionUpdate?: (editor: Editor) => void;
  onReady?: (editor: Editor) => void;
  ref?: React.Ref<RichTextEditorHandle>;
}

export function RichTextEditor({
  initialContent,
  editable,
  onUpdate,
  onSelectionUpdate,
  onReady,
  ref,
}: RichTextEditorProps) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ link: false }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing, or press “/” for commands…" }),
      CharacterCount,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none px-2",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Document body",
      },
    },
    onUpdate: ({ editor }) => onUpdateRef.current(editor.getHTML()),
    onSelectionUpdate: ({ editor }) => onSelectionUpdate?.(editor),
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });
  useEffect(() => {
    if (editor) onReadyRef.current?.(editor);
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editor,
      setContent: (html: string) => {
        editor?.commands.setContent(html, { emitUpdate: false });
      },
    }),
    [editor],
  );

  return <EditorContent editor={editor} className="min-h-[60vh]" />;
}
