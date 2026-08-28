import type { ReactNode } from "react";

/**
 * Renders **bold**, *italic*, and _italic_ markers within KB block text.
 */
export function renderKbInlineText(text: string): ReactNode[] {
  if (!text) return [];

  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g;
  const parts = text.split(pattern).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      ((part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))) &&
      part.length > 2
    ) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}
