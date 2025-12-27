import * as cheerio from "cheerio";
import path from "path";
import JSZip from "jszip";
import type { EpubChapter } from "./types";
import { cleanHtml } from "./clean-html";

interface ManifestItem {
  href: string;
  type: string;
}

/**
 * Extracts chapters from EPUB spine in reading order
 * Filters XHTML files and extracts title, content, and order
 */
export async function extractChapters(
  zip: JSZip,
  opfPath: string,
  opfContent: string
): Promise<EpubChapter[]> {
  const chapters: EpubChapter[] = [];
  const opfDir = path.dirname(opfPath);
  // Normalize OPF directory to use forward slashes (EPUB ZIP entries always use '/').
  const opfDirNormalized = opfDir.replace(/\\/g, "/");

  // Parse OPF manifest
  const $opf = cheerio.load(opfContent, { xmlMode: true });

  const manifest: Record<string, ManifestItem> = {};

  $opf("manifest item").each((_i, el) => {
    const $el = $opf(el);
    const id = $el.attr("id");
    const href = $el.attr("href");
    const type = $el.attr("media-type");

    if (id && href && type) {
      // Build a ZIP-friendly href using posix-style separators.
      const joined = opfDirNormalized ? `${opfDirNormalized}/${href}` : href;
      const normalizedHref = joined.replace(/\\/g, "/").replace(/\/\/+/, "/");

      manifest[id] = {
        href: normalizedHref,
        type,
      };
    }
  });

  // Extract spine (reading order)
  const spine: string[] = [];

  $opf("spine itemref").each((_i, el) => {
    const $el = $opf(el);
    const idref = $el.attr("idref");

    if (idref && manifest[idref] && manifest[idref].type.includes("xhtml")) {
      spine.push(manifest[idref].href);
    }
  });

  // Process each chapter
  let chapterNumber = 1;

  for (const filePath of spine) {
    const entry = zip.file(filePath);
    if (!entry) continue;

    const xhtml = await entry.async("string");
    const $ = cheerio.load(xhtml);

    // Extract title from headings or fallback to generic name
    const title =
      $("h1").first().text() ||
      $("h2").first().text() ||
      $("title").text() ||
      `Chapter ${chapterNumber}`;

    // Extract and rewrite image references
    const chapterDir = path.dirname(filePath).replace(/\\/g, "/");
    const imageUrls: string[] = [];

    $("img").each((_i, el) => {
      const $img = $(el);
      const imgSrc = $img.attr("src");
      if (!imgSrc) return;

      // Resolve relative image path
      const imagePath = chapterDir
        ? `${chapterDir}/${imgSrc}`
        : imgSrc;
      const normalizedImagePath = imagePath
        .replace(/\\/g, "/")
        .replace(/\/\/+/, "/");

      // Check if image exists in ZIP
      const imgEntry = zip.file(normalizedImagePath);
      if (imgEntry) {
        // Generate unique image filename based on chapter and index
        const ext = path.extname(normalizedImagePath);
        const filename = `ch${chapterNumber}_img${imageUrls.length + 1}${ext}`;
        const publicUrl = `/uploads/epub/${filename}`;
        
        // Store for later extraction
        imageUrls.push(normalizedImagePath); // Keep reference for extraction
        
        // Rewrite src attribute to public URL
        $img.attr("src", publicUrl);
      }
    });

    // Extract body content (with rewritten image URLs)
    const bodyHtml = $("body").html()?.trim() ?? "";
    const bodyText = $("body").text()?.trim() ?? "";

    // Use word count on plain text to detect real chapters (more robust across EPUBs)
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 20) {
      // Likely not a chapter (nav document, toc, cover, etc.)
      continue;
    }

    // Sanitize HTML before storing
    const cleanedHtml = cleanHtml(bodyHtml);

    chapters.push({
      title: title.trim(),
      order: chapterNumber,
      contentHtml: cleanedHtml,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });

    chapterNumber++;
  }

  return chapters;
}
