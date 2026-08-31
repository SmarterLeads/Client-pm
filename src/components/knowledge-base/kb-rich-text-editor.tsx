"use client";

import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  KB_FONT_SIZE_OPTIONS,
  KbFontSize,
  type KbFontSizeOption,
} from "@/lib/knowledge-base/kb-font-size-extension";
import { kbEditorTypographyClassName } from "@/lib/knowledge-base/kb-typography";
import { normalizeRichTextHtml, prepareRichTextForEditor } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type KbRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-xs"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="size-8 shrink-0"
    >
      {children}
    </Button>
  );
}

const HEADING_OPTIONS = [
  { label: "Normal", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
] as const;

function currentHeadingValue(
  isActive: (name: string, attrs?: Record<string, unknown>) => boolean,
): string {
  if (isActive("heading", { level: 1 })) return "h1";
  if (isActive("heading", { level: 2 })) return "h2";
  if (isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

export function KbRichTextEditor({
  value,
  onChange,
  onUploadImage,
  placeholder = "Start writing your article…",
  disabled = false,
  className,
}: KbRichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContent = prepareRichTextForEditor(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "rounded-lg bg-muted p-4 font-mono text-sm" } },
      }),
      Underline,
      TextStyle,
      KbFontSize,
      Color,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: editorContent,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(normalizeRichTextHtml(currentEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: kbEditorTypographyClassName,
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "u") {
          event.preventDefault();
          editor?.chain().focus().toggleUnderline().run();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = prepareRichTextForEditor(value);
    const current = normalizeRichTextHtml(editor.getHTML());
    const normalizedNext = normalizeRichTextHtml(next);
    if (current !== normalizedNext) {
      editor.commands.setContent(next || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadImage || !editor) return;

    const src = await onUploadImage(file);
    if (src) {
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    }
  }

  function insertLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function setHeading(value: (typeof HEADING_OPTIONS)[number]["value"]) {
    if (!editor) return;
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
      return;
    }
    const level = Number(value.replace("h", "")) as 1 | 2 | 3;
    editor.chain().focus().toggleHeading({ level }).run();
  }

  function setFontSize(size: KbFontSizeOption | "") {
    if (!editor) return;
    if (!size) {
      editor.chain().focus().setKbFontSize(null).run();
      return;
    }
    editor.chain().focus().setKbFontSize(size).run();
  }

  const headingValue = editor ? currentHeadingValue(editor.isActive.bind(editor)) : "paragraph";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ToolbarButton
          label="Bold (⌘B)"
          disabled={disabled || !editor}
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic (⌘I)"
          disabled={disabled || !editor}
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline (⌘U)"
          disabled={disabled || !editor}
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          disabled={disabled || !editor}
          active={editor?.isActive("strike")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

        <select
          aria-label="Font size"
          disabled={disabled || !editor}
          defaultValue=""
          onChange={(event) => setFontSize(event.target.value as KbFontSizeOption | "")}
          className="h-8 max-w-[100px] rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Size</option>
          {KB_FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Heading level"
          disabled={disabled || !editor}
          value={headingValue}
          onChange={(event) =>
            setHeading(event.target.value as (typeof HEADING_OPTIONS)[number]["value"])
          }
          className="h-8 max-w-[120px] rounded-md border border-input bg-background px-2 text-xs"
        >
          {HEADING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

        <ToolbarButton
          label="Bullet list"
          disabled={disabled || !editor}
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          disabled={disabled || !editor}
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Insert link"
          disabled={disabled || !editor}
          active={editor?.isActive("link")}
          onClick={insertLink}
        >
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Insert image"
          disabled={disabled || !editor || !onUploadImage}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Divider"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          disabled={disabled || !editor}
          active={editor?.isActive("codeBlock")}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 1"
          disabled={disabled || !editor}
          active={editor?.isActive("heading", { level: 1 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
