import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseEpub, MAX_EPUB_FILE_SIZE } from "@/lib/epub";
import { logAuditAction } from "@/lib/audit";

interface ImportEpubResponse {
  success: boolean;
  chaptersImported: number;
}

interface ImportEpubError {
  error: string;
  code?: string;
}

export async function POST(req: Request): Promise<NextResponse<ImportEpubResponse | ImportEpubError>> {
  const guard = await requireAdmin();
  if (guard) return guard;
  try {
    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const novelIdRaw = formData.get("novelId");
    const novelId = Number(novelIdRaw);

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "No file provided", code: "NO_FILE" },
        { status: 400 }
      );
    }

    if (!novelIdRaw || Number.isNaN(novelId) || novelId <= 0) {
      return NextResponse.json(
        { error: "Invalid or missing novel ID", code: "INVALID_NOVEL_ID" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".epub")) {
      return NextResponse.json(
        { error: "File must be an EPUB file (.epub)", code: "INVALID_FILE_TYPE" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_EPUB_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File exceeds maximum size of ${MAX_EPUB_FILE_SIZE / (1024 * 1024)}MB`,
          code: "FILE_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Verify novel exists in database
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true, title: true },
    });

    if (!novel) {
      return NextResponse.json(
        { error: `Novel with ID ${novelId} not found`, code: "NOVEL_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Request metadata for audit
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.headers.get("host") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Log import attempt
    await logAuditAction({
      action: "EPUB_IMPORT",
      resource: `Novel:${novelId}`,
      details: { fileName: file.name, fileSize: file.size },
      ipAddress,
      userAgent,
      success: true,
    }).catch((e) => console.error("Failed to log EPUB import attempt:", e));

    // Parse EPUB file
    const parsedEpub = await parseEpub(buffer, novelId);

    // Import chapters to database
    let chaptersImported = 0;

    for (const chapter of parsedEpub.chapters) {
      try {
        // Check for duplicate chapter number
        const existing = await prisma.chapter.findUnique({
          where: {
            novelId_number: {
              novelId,
              number: chapter.order,
            },
          },
        });

        if (existing) {
          // Skip duplicate chapter numbers
          continue;
        }

        await prisma.chapter.create({
          data: {
            novelId,
            number: chapter.order,
            title: chapter.title,
            contentHtml: chapter.contentHtml,
          },
        });

        chaptersImported++;
      } catch (error) {
        // Log chapter-specific errors but continue with other chapters
        console.error(`Failed to import chapter ${chapter.order}: ${error}`);
        await logAuditAction({
          action: "EPUB_IMPORT",
          resource: `ChapterImport:${chapter.order}`,
          details: { novelId, chapterOrder: chapter.order, error: error instanceof Error ? error.message : String(error) },
          ipAddress: ipAddress as string | undefined,
          userAgent,
          success: false,
        }).catch((e) => console.error("Failed to log chapter import error:", e));
      }
    }

    if (chaptersImported === 0) {
      // Log failure: no chapters imported
      await logAuditAction({
        action: "EPUB_IMPORT",
        resource: `Novel:${novelId}`,
        details: { chaptersImported },
        ipAddress: ipAddress as string | undefined,
        userAgent,
        success: false,
      }).catch((e) => console.error("Failed to log EPUB import failure:", e));

      return NextResponse.json(
        { error: "No chapters were successfully imported", code: "NO_CHAPTERS_IMPORTED" },
        { status: 400 }
      );
    }

    // Log successful import
    await logAuditAction({
      action: "EPUB_IMPORT",
      resource: `Novel:${novelId}`,
      details: { chaptersImported, fileName: file.name },
      ipAddress: ipAddress as string | undefined,
      userAgent,
      success: true,
    }).catch((e) => console.error("Failed to log EPUB import success:", e));

    return NextResponse.json<ImportEpubResponse>(
      {
        success: true,
        chaptersImported,
      },
      { status: 200 }
    );
  } catch (error) {
    // Log unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("EPUB import error:", errorMessage);

    // Determine error type and return appropriate response
    if (errorMessage.includes("Invalid EPUB") || errorMessage.includes("ZIP")) {
      return NextResponse.json(
        { error: "File is not a valid EPUB file", code: "INVALID_EPUB" },
        { status: 400 }
      );
    }

    if (errorMessage.includes("exceeds maximum size")) {
      return NextResponse.json(
        {
          error: errorMessage,
          code: "FILE_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    // Generic error response
    await logAuditAction({
      action: "EPUB_IMPORT",
      resource: `Novel:unknown`,
      details: { error: errorMessage },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.headers.get("host") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
      success: false,
    }).catch((e) => console.error("Failed to log EPUB import unexpected error:", e));

    return NextResponse.json(
      {
        error: "Failed to import EPUB file. Please check the file and try again.",
        code: "IMPORT_FAILED",
      },
      { status: 500 }
    );
  }
}
