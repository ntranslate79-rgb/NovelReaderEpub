import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  generateWebP?: boolean;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 80,
  generateWebP: true,
};

/**
 * Optimizes an image by resizing and optionally converting to WebP
 * @param imageBuffer - Raw image data
 * @param filename - Original filename with extension
 * @param outputDir - Directory to save optimized images
 * @param options - Optimization options
 * @returns Array of saved filenames (original format + WebP if enabled)
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  filename: string,
  outputDir: string,
  options: OptimizationOptions = {}
): Promise<string[]> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filenameParts = path.parse(filename);
  const savedFiles: string[] = [];

  try {
    // Resize and optimize original format
    const ext = filenameParts.ext.toLowerCase();
    const isWebP = ext === ".webp";

    if (!isWebP) {
      const resized = sharp(imageBuffer)
        .resize(mergedOptions.maxWidth, mergedOptions.maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });

      // Apply format-specific quality settings
      let pipeline = resized;
      if (ext === ".jpg" || ext === ".jpeg") {
        pipeline = resized.jpeg({ quality: mergedOptions.quality });
      } else if (ext === ".png") {
        pipeline = resized.png({
          quality: mergedOptions.quality,
          compressionLevel: 9,
        });
      } else if (ext === ".gif") {
        pipeline = resized.gif();
      } else {
        pipeline = resized.toFormat("webp", {
          quality: mergedOptions.quality,
        });
      }

      const optimizedBuffer = await pipeline.toBuffer();
      writeFileSync(path.join(outputDir, filename), optimizedBuffer);
      savedFiles.push(filename);
    } else {
      // If already WebP, just copy it
      writeFileSync(path.join(outputDir, filename), imageBuffer);
      savedFiles.push(filename);
    }

    // Generate WebP version if enabled and not already WebP
    if (mergedOptions.generateWebP && !isWebP) {
      const webpFilename = `${filenameParts.name}.webp`;
      const webpBuffer = await sharp(imageBuffer)
        .resize(mergedOptions.maxWidth, mergedOptions.maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: mergedOptions.quality })
        .toBuffer();

      writeFileSync(path.join(outputDir, webpFilename), webpBuffer);
      savedFiles.push(webpFilename);
    }

    return savedFiles;
  } catch (error) {
    console.error(`Failed to optimize image ${filename}:`, error);
    throw new Error(`Image optimization failed: ${String(error)}`);
  }
}

/**
 * Generate a picture element with WebP support and fallback
 * @param primaryFilename - Original image filename
 * @param webpFilename - WebP version filename (if exists)
 * @param publicPath - Public URL path (e.g., /uploads/epub/)
 */
export function generatePictureElement(
  primaryFilename: string,
  webpFilename: string | null,
  publicPath: string,
  alt: string = "",
  width?: number,
  height?: number
): string {
  const widthAttr = width ? ` width="${width}"` : "";
  const heightAttr = height ? ` height="${height}"` : "";

  if (webpFilename) {
    return `<picture>
      <source srcset="${publicPath}${webpFilename}" type="image/webp">
      <img src="${publicPath}${primaryFilename}" alt="${alt}"${widthAttr}${heightAttr}>
    </picture>`;
  }

  return `<img src="${publicPath}${primaryFilename}" alt="${alt}"${widthAttr}${heightAttr}>`;
}
