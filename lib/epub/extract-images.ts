import JSZip from "jszip";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { optimizeImage } from "@/lib/image-optimizer";

/**
 * Extracts images from EPUB and saves them to public/uploads/epub/
 * Optimizes images (resize, WebP conversion) before saving
 * Returns a mapping of original paths to public URLs
 */
export async function extractImagesToPublic(
  zip: JSZip,
  imagePaths: string[],
  novelId: number
): Promise<Map<string, string>> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "epub");

  // Create directory if it doesn't exist
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const urlMap = new Map<string, string>();
  const processedNames = new Set<string>();

  for (const imagePath of imagePaths) {
    const zipEntry = zip.file(imagePath);
    if (!zipEntry) continue;

    try {
      const imageBuffer = await zipEntry.async("arraybuffer");

      // Generate unique filename: novel_id_timestamp_random.ext
      const ext = path.extname(imagePath);
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      let filename = `novel${novelId}_${timestamp}_${random}${ext}`;

      // Ensure filename uniqueness
      while (processedNames.has(filename)) {
        filename = `novel${novelId}_${timestamp}_${Math.random()
          .toString(36)
          .slice(2, 8)}${ext}`;
      }

      // Optimize and save the image
      try {
        const optimizedFiles = await optimizeImage(
          Buffer.from(imageBuffer),
          filename,
          uploadsDir,
          {
            maxWidth: 1000,
            maxHeight: 1000,
            quality: 85,
            generateWebP: true,
          }
        );

        // Map original path to the primary public URL
        const publicUrl = `/uploads/epub/${optimizedFiles[0]}`;
        urlMap.set(imagePath, publicUrl);

        optimizedFiles.forEach((f) => processedNames.add(f));
      } catch (optError) {
        console.warn(`Failed to optimize image ${imagePath}, saving original:`, optError);
        // Fallback: save original if optimization fails
        const filePath = path.join(uploadsDir, filename);
        writeFileSync(filePath, Buffer.from(imageBuffer));
        const publicUrl = `/uploads/epub/${filename}`;
        urlMap.set(imagePath, publicUrl);
        processedNames.add(filename);
      }
    } catch (error) {
      console.error(`Failed to process image ${imagePath}:`, error);
      // Continue with next image if this one fails
    }
  }

  return urlMap;
}
