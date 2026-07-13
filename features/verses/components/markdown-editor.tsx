"use client";

import { useRef, useState } from "react";
import { Bold, Eye, Heading2, Italic, Link, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditorMode = "write" | "preview";
type InlineFormat = "bold" | "italic" | "link";
type LineFormat = "heading" | "bullet-list" | "numbered-list" | "quote";

export type MarkdownEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  maxLength: number;
};

type ToolbarButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

/** Accessible icon button used by the study-note formatting toolbar. */
function ToolbarButton({ label, disabled, onClick, children }: ToolbarButtonProps): React.ReactNode {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11 rounded-md"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Focused Markdown editor for admin-authored study notes.
 *
 * The source remains plain Markdown in the existing database column. Preview
 * output is rendered into React elements with embedded HTML explicitly skipped,
 * which keeps authoring expressive without introducing an HTML injection path.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  invalid = false,
  maxLength,
}: MarkdownEditorProps): React.ReactNode {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<string[]>([value]);
  const historyIndexRef = useRef(0);
  const [mode, setMode] = useState<EditorMode>("write");
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  function updateHistoryState(): void {
    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  }

  function commitValue(nextValue: string): void {
    if (nextValue === value || nextValue.length > maxLength) return;

    // WHY: Editor-managed history makes toolbar undo/redo predictable even when
    // formatting changes both the text and selection in one controlled update.
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(nextValue);
    historyIndexRef.current += 1;
    updateHistoryState();
    onChange(nextValue);
  }

  function restoreSelection(start: number, end: number): void {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start, end);
    });
  }

  function applyInlineFormat(format: InlineFormat): void {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.slice(start, end);
    const formats = {
      bold: { prefix: "**", suffix: "**", placeholder: "bold text" },
      italic: { prefix: "*", suffix: "*", placeholder: "italic text" },
      link: { prefix: "[", suffix: "](https://example.com)", placeholder: "link text" },
    } as const;
    const selectedFormat = formats[format];
    const content = selection || selectedFormat.placeholder;
    const replacement = `${selectedFormat.prefix}${content}${selectedFormat.suffix}`;
    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;

    commitValue(nextValue);
    const contentStart = start + selectedFormat.prefix.length;
    restoreSelection(contentStart, contentStart + content.length);
  }

  function applyLineFormat(format: LineFormat): void {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextBreak = value.indexOf("\n", selectionEnd);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selectedLines = value.slice(lineStart, lineEnd).split("\n");
    const prefixByFormat = {
      heading: () => "## ",
      "bullet-list": () => "- ",
      "numbered-list": (index: number) => `${index + 1}. `,
      quote: () => "> ",
    } satisfies Record<LineFormat, (index: number) => string>;
    const replacement = selectedLines
      .map((line, index) => `${prefixByFormat[format](index)}${line}`)
      .join("\n");
    const nextValue = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`;

    commitValue(nextValue);
    restoreSelection(lineStart, lineStart + replacement.length);
  }

  function moveThroughHistory(direction: -1 | 1): void {
    const nextIndex = historyIndexRef.current + direction;
    const nextValue = historyRef.current[nextIndex];
    if (nextValue === undefined) return;

    historyIndexRef.current = nextIndex;
    updateHistoryState();
    onChange(nextValue);
    restoreSelection(nextValue.length, nextValue.length);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key === "b" || key === "i") {
      event.preventDefault();
      applyInlineFormat(key === "b" ? "bold" : "italic");
      return;
    }

    if (key === "z") {
      event.preventDefault();
      moveThroughHistory(event.shiftKey ? 1 : -1);
      return;
    }

    if (key === "y") {
      event.preventDefault();
      moveThroughHistory(1);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background transition-colors",
        invalid && "border-destructive ring-3 ring-destructive/20",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/35 px-2 py-1.5">
        <div className="flex min-h-11 items-center" role="tablist" aria-label="Study note editor mode">
          <Button type="button" variant={mode === "write" ? "secondary" : "ghost"} className="min-h-11" role="tab" aria-selected={mode === "write"} disabled={disabled} onClick={() => setMode("write")}>
            Write
          </Button>
          <Button type="button" variant={mode === "preview" ? "secondary" : "ghost"} className="min-h-11" role="tab" aria-selected={mode === "preview"} disabled={disabled} onClick={() => setMode("preview")}>
            <Eye aria-hidden="true" />
            Preview
          </Button>
        </div>
        <span className="px-2 text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {value.length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>

      {mode === "write" ? (
        <>
          <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1" role="toolbar" aria-label="Study note formatting">
            <ToolbarButton label="Bold (Ctrl+B)" disabled={disabled} onClick={() => applyInlineFormat("bold")}><Bold aria-hidden="true" /></ToolbarButton>
            <ToolbarButton label="Italic (Ctrl+I)" disabled={disabled} onClick={() => applyInlineFormat("italic")}><Italic aria-hidden="true" /></ToolbarButton>
            <ToolbarButton label="Heading" disabled={disabled} onClick={() => applyLineFormat("heading")}><Heading2 aria-hidden="true" /></ToolbarButton>
            <ToolbarButton label="Bulleted list" disabled={disabled} onClick={() => applyLineFormat("bullet-list")}><List aria-hidden="true" /></ToolbarButton>
            <ToolbarButton label="Numbered list" disabled={disabled} onClick={() => applyLineFormat("numbered-list")}><ListOrdered aria-hidden="true" /></ToolbarButton>
            <ToolbarButton label="Block quote" disabled={disabled} onClick={() => applyLineFormat("quote")}><Quote aria-hidden="true" /></ToolbarButton>
            <ToolbarButton label="Insert link" disabled={disabled} onClick={() => applyInlineFormat("link")}><Link aria-hidden="true" /></ToolbarButton>
            <span className="mx-1 h-7 w-px bg-border" aria-hidden="true" />
            <ToolbarButton label="Undo (Ctrl+Z)" disabled={disabled || !historyState.canUndo} onClick={() => moveThroughHistory(-1)}><Undo2 aria-hidden="true" /></ToolbarButton>
            <ToolbarButton label="Redo (Ctrl+Y)" disabled={disabled || !historyState.canRedo} onClick={() => moveThroughHistory(1)}><Redo2 aria-hidden="true" /></ToolbarButton>
          </div>
          <Textarea
            ref={textareaRef}
            id={id}
            value={value}
            rows={12}
            maxLength={maxLength}
            disabled={disabled}
            aria-invalid={invalid}
            aria-label="Study note Markdown source"
            className="min-h-72 resize-y rounded-none border-0 bg-transparent px-4 py-4 font-mono text-sm shadow-none focus-visible:ring-0"
            placeholder="Add headings, key insights, lists, quotations, and helpful links…"
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            onChange={(event) => commitValue(event.target.value)}
          />
        </>
      ) : (
        <div role="tabpanel" aria-label="Study note preview" className="min-h-72 px-5 py-5 text-sm leading-7 wrap-break-word">
          {value.trim() ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              components={{
                h1: ({ children }) => <h1 className="mb-4 text-2xl font-bold tracking-tight">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-semibold tracking-tight first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold">{children}</h3>,
                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6">{children}</ol>,
                blockquote: ({ children }) => <blockquote className="mb-4 border-l-4 border-primary/45 bg-muted/45 px-4 py-2 italic text-muted-foreground">{children}</blockquote>,
                a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-primary underline decoration-primary/45 underline-offset-4 hover:decoration-primary">{children}</a>,
                code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>,
                hr: () => <hr className="my-6 border-border" />,
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
