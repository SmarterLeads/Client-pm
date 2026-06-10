import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormattedBlock =
  | { kind: "heading"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "paragraph"; lines: string[] };

const BULLET_LINE = /^\s*[-*•]\s+/;
const ORDERED_LINE = /^\s*\d+\.\s+/;

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function stripBulletPrefix(line: string) {
  return line.replace(BULLET_LINE, "").replace(ORDERED_LINE, "").trim();
}

function isBulletLine(line: string) {
  return BULLET_LINE.test(line);
}

function isOrderedLine(line: string) {
  return ORDERED_LINE.test(line);
}

function isListLine(line: string) {
  return isBulletLine(line) || isOrderedLine(line);
}

function stripHeadingMarkers(line: string) {
  return line
    .replace(/^\*\*(.+)\*\*:?$/, "$1")
    .replace(/:$/, "")
    .trim();
}

function isHeadingLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/^\*\*.+\*\*:?$/.test(trimmed)) {
    return true;
  }

  if (trimmed.endsWith(":") && trimmed.length <= 80) {
    return true;
  }

  if (
    trimmed.length <= 60 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed) &&
    /\s/.test(trimmed)
  ) {
    return true;
  }

  return false;
}

function parseFormattedBlocks(text: string): FormattedBlock[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const sections = normalized.split(/\n\s*\n/);
  const blocks: FormattedBlock[] = [];

  for (const section of sections) {
    const lines = section.split("\n").map((line) => line.trimEnd());
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) continue;

    if (nonEmptyLines.every(isListLine)) {
      blocks.push({
        kind: "list",
        ordered: nonEmptyLines.every(isOrderedLine),
        items: nonEmptyLines.map(stripBulletPrefix),
      });
      continue;
    }

    if (
      nonEmptyLines.length > 1 &&
      isHeadingLine(nonEmptyLines[0]) &&
      nonEmptyLines.slice(1).every(isListLine)
    ) {
      blocks.push({
        kind: "heading",
        text: stripHeadingMarkers(nonEmptyLines[0].trim()),
      });
      blocks.push({
        kind: "list",
        ordered: nonEmptyLines.slice(1).every(isOrderedLine),
        items: nonEmptyLines.slice(1).map(stripBulletPrefix),
      });
      continue;
    }

    if (nonEmptyLines.length === 1 && isHeadingLine(nonEmptyLines[0])) {
      blocks.push({
        kind: "heading",
        text: stripHeadingMarkers(nonEmptyLines[0].trim()),
      });
      continue;
    }

    blocks.push({ kind: "paragraph", lines: nonEmptyLines });
  }

  return blocks;
}

function renderInlineText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function renderParagraphLines(lines: string[]) {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInlineText(line.trim())}
    </Fragment>
  ));
}

export type FormattedTextProps = {
  children: string;
  className?: string;
};

export function FormattedText({ children, className }: FormattedTextProps) {
  const blocks = parseFormattedBlocks(children);
  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <p key={index} className="font-semibold text-foreground">
              {renderInlineText(block.text)}
            </p>
          );
        }

        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={cn(
                "space-y-1 pl-5",
                block.ordered ? "list-decimal" : "list-disc",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineText(item)}</li>
              ))}
            </ListTag>
          );
        }

        return <p key={index}>{renderParagraphLines(block.lines)}</p>;
      })}
    </div>
  );
}
