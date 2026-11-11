"use client";

import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  UnderlineIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

type DocumentEditorProps = {
  initialHtml: string;
  editable: boolean;
  onChange: (html: string) => void;
};

export function DocumentEditor({ initialHtml, editable, onChange }: DocumentEditorProps) {
  const baseline = useRef<string | null>(null);
  const lastEmitted = useRef<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
      }),
      Placeholder.configure({
        placeholder: "Start the draft. Headings, lists, and emphasis stay with the document.",
      }),
    ],
    content: initialHtml || "<p></p>",
    editorProps: {
      attributes: {
        class: "folio-prose",
        "aria-label": "Document body",
      },
    },
    onCreate: ({ editor: current }) => {
      const next = current.getHTML();
      baseline.current = next;
      lastEmitted.current = next;
    },
    onUpdate: ({ editor: current }) => {
      const next = current.getHTML();
      if (baseline.current === null) {
        baseline.current = next;
        lastEmitted.current = next;
        return;
      }
      if (next === lastEmitted.current) return;
      lastEmitted.current = next;
      onChange(next);
    },
  });

  if (!editor) {
    return <div className="folio-prose min-h-[50vh] animate-pulse rounded-md bg-muted/60" />;
  }

  return (
    <div>
      {editable ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} className="folio-editor" />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      h1: current.isActive("heading", { level: 1 }),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      link: current.isActive("link"),
    }),
  });

  function applyLink() {
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
    } else {
      const next = /^(https?:|mailto:)/i.test(href) ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: next }).run();
    }
    setLinkOpen(false);
  }

  return (
    <div className="sticky top-14 z-20 -mx-1 mb-6 border-b border-border/80 bg-background/90 px-1 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1 overflow-x-auto" role="toolbar" aria-label="Formatting">
        <ToolButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <BoldIcon />
        </ToolButton>
        <ToolButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <ItalicIcon />
        </ToolButton>
        <ToolButton label="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon />
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Heading 1" active={state.h1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <span className="text-xs font-semibold">H1</span>
        </ToolButton>
        <ToolButton label="Heading 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <span className="text-xs font-semibold">H2</span>
        </ToolButton>
        <ToolButton label="Heading 3" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <span className="text-xs font-semibold">H3</span>
        </ToolButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton label="Bulleted list" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListIcon />
        </ToolButton>
        <ToolButton label="Numbered list" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrderedIcon />
        </ToolButton>
        <ToolButton
          label="Link"
          active={state.link || linkOpen}
          onClick={() => {
            const previous = editor.getAttributes("link").href as string | undefined;
            setLinkValue(previous ?? "");
            setLinkOpen((open) => !open);
          }}
        >
          <LinkIcon />
        </ToolButton>
      </div>
      {linkOpen ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <Input
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            placeholder="https://example.com"
            aria-label="Link address"
            className="h-8 bg-card"
          />
          <Button type="submit" size="sm">
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
          >
            Remove
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-accent text-accent-foreground")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
