import { Extension } from "@tiptap/core";

export type KbFontSizeOption = "0.875rem" | "1rem" | "1.125rem" | "1.25rem";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    kbFontSize: {
      setKbFontSize: (size: string | null) => ReturnType;
    };
  }
}

export const KbFontSize = Extension.create({
  name: "kbFontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setKbFontSize:
        (fontSize: string | null) =>
        ({ chain }) => {
          if (!fontSize) {
            return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
          }
          return chain().setMark("textStyle", { fontSize }).run();
        },
    };
  },
});

export const KB_FONT_SIZE_OPTIONS = [
  { label: "Small", value: "0.875rem" as const },
  { label: "Normal", value: "1rem" as const },
  { label: "Large", value: "1.125rem" as const },
  { label: "XL", value: "1.25rem" as const },
];
