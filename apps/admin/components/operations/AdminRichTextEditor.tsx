"use client";

import { useCallback, useEffect } from "react";
import { Link } from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";

export type RichTextDocument = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichTextDocument[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
};

export const EMPTY_RICH_TEXT_DOCUMENT: RichTextDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 disabled:opacity-40 ${
        active
          ? "bg-slate-950 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

export function AdminRichTextEditor({
  value,
  onChange,
  editable = true,
  ariaLabel = "공지 내용",
}: {
  value: RichTextDocument;
  onChange?: (value: RichTextDocument) => void;
  editable?: boolean;
  ariaLabel?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: !editable,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    content: value,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class:
          "min-h-48 px-4 py-3 text-sm leading-7 text-slate-700 outline-none [&_a]:text-blue-700 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange?.(nextEditor.getJSON());
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (editor && JSON.stringify(value) !== JSON.stringify(editor.getJSON())) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = String(editor.getAttributes("link").href ?? "");
    const url = window.prompt("링크 URL을 입력하세요.", previousUrl);
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: parsed.toString() })
        .run();
    } catch {
      window.alert("http 또는 https 링크만 입력할 수 있습니다.");
    }
  }, [editor]);

  if (!editor) {
    return <div className="min-h-48 rounded-lg bg-slate-50" />;
  }

  return (
    <div className="overflow-hidden rounded-lg bg-slate-50">
      {editable && (
        <div
          role="toolbar"
          aria-label="공지 서식"
          className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-2 py-2"
        >
          <ToolbarButton
            label="굵게"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="기울임"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="소제목"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="글머리 목록"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="번호 목록"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="링크"
            active={editor.isActive("link")}
            onClick={setLink}
          >
            <LinkIcon size={16} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
          <ToolbarButton
            label="실행 취소"
            disabled={!editor.can().chain().focus().undo().run()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="다시 실행"
            disabled={!editor.can().chain().focus().redo().run()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={16} />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
