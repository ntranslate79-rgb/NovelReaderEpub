import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes HTML content extracted from EPUB files
 * Removes potentially dangerous elements while preserving readability and images
 */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "i",
      "b",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "ol",
      "ul",
      "li",
      "a",
      "span",
      "div",
      "hr",
      "sup",
      "sub",
      "img",
    ],
    allowedAttributes: {
      a: ["href"],
      img: ["src", "alt", "title", "width", "height"],
    },
    disallowedTagsMode: "discard",
  });
}
