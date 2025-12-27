import JSZip from "jszip";
import type { ParsedEpub } from "./types";
import { extractMetadata } from "./extract-metadata";
import { extractChapters } from "./extract-chapters";
import { extractImagesToPublic } from "./extract-images";

export const MAX_EPUB_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Parses EPUB file and extracts metadata, chapters, and images
 * Optionally extracts images to public/uploads/epub/ if novelId provided
 * @param buffer - EPUB file buffer
 * @param novelId - Optional novel ID for image extraction
 */
export async function parseEpub(buffer: Buffer, novelId?: number): Promise<ParsedEpub> {
  // Validate file size
  if (buffer.length > MAX_EPUB_FILE_SIZE) {
    throw new Error(`EPUB file exceeds maximum size of ${MAX_EPUB_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Load and validate ZIP structure
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("Invalid EPUB file: Could not parse as ZIP archive");
  }

  // Locate container.xml to find OPF path
  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) {
    throw new Error("Invalid EPUB structure: Missing META-INF/container.xml");
  }

  // Extract OPF path from container.xml
  const opfPathMatch = containerXml.match(/full-path="(.+?)"/);
  if (!opfPathMatch) {
    throw new Error("Invalid EPUB structure: Could not locate OPF manifest");
  }

  const opfPath = opfPathMatch[1];

  // Load and parse OPF file
  const opfContent = await zip.file(opfPath)?.async("string");
  if (!opfContent) {
    throw new Error("Invalid EPUB structure: Could not read OPF manifest");
  }

  // Extract metadata and chapters
  const metadata = extractMetadata(opfContent);
  const chapters = await extractChapters(zip, opfPath, opfContent);

  if (chapters.length === 0) {
    throw new Error("No readable chapters found in EPUB file");
  }

  // Optionally extract images if novelId provided
  if (novelId && chapters.some((ch) => ch.imageUrls?.length)) {
    const allImagePaths = chapters
      .flatMap((ch) => ch.imageUrls ?? [])
      .filter((path, idx, arr) => arr.indexOf(path) === idx); // Deduplicate

    if (allImagePaths.length > 0) {
      try {
        await extractImagesToPublic(zip, allImagePaths, novelId);
        // Images are already rewritten in chapters by extract-chapters
      } catch (error) {
        console.warn("Failed to extract images:", error);
        // Continue without images; URLs remain as placeholders
      }
    }
  }

  return {
    metadata,
    chapters,
  };
}

// Export all utilities
export { extractMetadata } from "./extract-metadata";
export { extractChapters } from "./extract-chapters";
export { cleanHtml } from "./clean-html";
export type { ParsedEpub, EpubMetadata, EpubChapter } from "./types";
