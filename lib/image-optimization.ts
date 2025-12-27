import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
}

/**
 * Optimize an image file
 * - Resizes if dimensions exceed max width/height
 * - Converts to WebP by default for better compression
 * - Returns the optimized image buffer
 */
export async function optimizeImage(
  inputPath: string,
  options: ImageOptimizationOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = "webp",
  } = options;

  let pipeline = sharp(inputPath);

  // Get image metadata to determine if resizing is needed
  const metadata = await pipeline.metadata();

  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > maxWidth || metadata.height > maxHeight)
  ) {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Apply format conversion and quality settings
  switch (format) {
    case "webp":
      return pipeline.webp({ quality }).toBuffer();
    case "jpeg":
      return pipeline.jpeg({ quality, progressive: true }).toBuffer();
    case "png":
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    default:
      return pipeline.webp({ quality }).toBuffer();
  }
}

/**
 * Optimize image and save to output path
 */
export async function optimizeImageToFile(
  inputPath: string,
  outputPath: string,
  options: ImageOptimizationOptions = {}
): Promise<void> {
  const buffer = await optimizeImage(inputPath, options);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Write optimized image
  await fs.writeFile(outputPath, buffer);
}

/**
 * Generate multiple variants of an image (thumbnail, medium, large)
 */
export async function generateImageVariants(
  inputPath: string,
  outputDir: string,
  filename: string
): Promise<{
  thumbnail: string;
  medium: string;
  large: string;
}> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const extension = ".webp";
  const basename = filename.replace(/\.[^/.]+$/, "");

  // Generate variants
  const thumbnailPath = path.join(outputDir, `${basename}-thumb${extension}`);
  const mediumPath = path.join(outputDir, `${basename}-medium${extension}`);
  const largePath = path.join(outputDir, `${basename}-large${extension}`);

  await Promise.all([
    optimizeImageToFile(inputPath, thumbnailPath, {
      maxWidth: 300,
      maxHeight: 300,
      quality: 80,
      format: "webp",
    }),
    optimizeImageToFile(inputPath, mediumPath, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 85,
      format: "webp",
    }),
    optimizeImageToFile(inputPath, largePath, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 90,
      format: "webp",
    }),
  ]);

  return {
    thumbnail: path.relative(process.cwd(), thumbnailPath),
    medium: path.relative(process.cwd(), mediumPath),
    large: path.relative(process.cwd(), largePath),
  };
}

/**
 * Get image dimensions without loading the full image
 */
export async function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(imagePath).metadata();
    if (metadata.width && metadata.height) {
      return {
        width: metadata.width,
        height: metadata.height,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting image dimensions:", error);
    return null;
  }
}
