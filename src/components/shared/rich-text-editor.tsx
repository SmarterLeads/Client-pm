"use client";

import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect } from "react";
import { richTextTypographyClassName } from "@/components/shared/rich-text-display";
import { Button } from "@/components/ui/button";
import { sheetFieldControlClassName } from "@/components/ui/sheet-form";
import { normalizeRichTextHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

export type RichTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  minHeightClassName?: string;
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
      className="size-7 shrink-0"
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value = "",
  onChange,
  onBlur,
  placeholder = "Write something…",
  disabled = false,
  className,
  name,
  minHeightClassName = "min-h-[150px]",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(normalizeRichTextHtml(currentEditor.getHTML()));
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          richTextTypographyClassName,
          minHeightClassName,
          "px-3 py-2 outline-none",
        ),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const current = normalizeRichTextHtml(editor.getHTML());
    const next = normalizeRichTextHtml(value);
    if (current !== next) {
      editor.commands.setContent(next || "", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const hiddenValue = normalizeRichTextHtml(value);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background shadow-xs dark:bg-input/30",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="flex flex-wrap gap-0.5 border-b border-input bg-muted/30 p-1">
        <ToolbarButton
          label="Bold"
          disabled={disabled || !editor}
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          disabled={disabled || !editor}
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          disabled={disabled || !editor}
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden />
        <ToolbarButton
          label="Heading 1"
          disabled={disabled || !editor}
          active={editor?.isActive("heading", { level: 1 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          disabled={disabled || !editor}
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          disabled={disabled || !editor}
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden />
        <ToolbarButton
          label="Bullet list"
          disabled={disabled || !editor}
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Ordered list"
          disabled={disabled || !editor}
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Blockquote"
          disabled={disabled || !editor}
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-3.5" />
        </ToolbarButton>
      </div>

      <div className={cn(sheetFieldControlClassName, "border-0 shadow-none")}>
        <EditorContent editor={editor} />
      </div>

      {name ? <input type="hidden" name={name} value={hiddenValue} readOnly /> : null}
    </div>
  );
}
