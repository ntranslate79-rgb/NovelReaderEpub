import * as cheerio from "cheerio";
import type { EpubMetadata } from "./types";

/**
 * Extracts metadata from EPUB OPF manifest
 * Returns title, author, and other publication info
 */
export function extractMetadata(opfContent: string): EpubMetadata {
  const $opf = cheerio.load(opfContent, { xmlMode: true });

  // Extract title - try standard DC namespace first
  const title =
    $opf("dc\\:title").first().text() ||
    $opf("title").first().text() ||
    "Untitled";

  // Extract author
  const author =
    $opf("dc\\:creator").first().text() ||
    $opf("creator").first().text() ||
    undefined;

  return {
    title: title.trim() || "Untitled",
    author: author?.trim(),
  };
}
