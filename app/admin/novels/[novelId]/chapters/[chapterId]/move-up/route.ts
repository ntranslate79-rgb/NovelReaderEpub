import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateCsrfToken } from "@/lib/csrf";
import { logAuditAction } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> }
) {
  const { novelId, chapterId } = await params;
  const nId = Number(novelId);
  const cId = Number(chapterId);

  if (isNaN(nId) || isNaN(cId)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Validate CSRF token
  const formData = await request.formData();
  const csrfToken = String(formData.get("_csrf") || "");

  if (!validateCsrfToken(csrfToken)) {
    await logAuditAction({
      action: "CHAPTER_MOVE",
      resource: `Chapter:${cId}`,
      details: { novelId: nId, error: "Invalid CSRF token" },
      success: false,
      errorMsg: "CSRF validation failed",
    }).catch((e) => console.error("Failed to log move-up audit:", e));

    return NextResponse.redirect(new URL(`/admin/novels/${nId}`, request.url));
  }

  const chapter = await prisma.chapter.findUnique({ where: { id: cId } });
  if (!chapter) {
    return NextResponse.redirect(new URL(`/admin/novels/${nId}`, request.url));
  }

  const prev = await prisma.chapter.findFirst({
    where: {
      novelId: nId,
      number: { lt: chapter.number },
    },
    orderBy: { number: "desc" },
  });

  if (!prev) {
    return NextResponse.redirect(new URL(`/admin/novels/${nId}`, request.url));
  }

  try {
    await prisma.$transaction([
      prisma.chapter.update({
        where: { id: chapter.id },
        data: { number: -1 }, // temp
      }),
      prisma.chapter.update({
        where: { id: prev.id },
        data: { number: chapter.number },
      }),
      prisma.chapter.update({
        where: { id: chapter.id },
        data: { number: prev.number },
      }),
    ]);

    await logAuditAction({
      action: "CHAPTER_MOVE",
      resource: `Chapter:${cId}`,
      details: { novelId: nId, fromNumber: chapter.number, toNumber: prev.number },
      success: true,
    }).catch((e) => console.error("Failed to log move-up audit:", e));
  } catch (error) {
    await logAuditAction({
      action: "CHAPTER_MOVE",
      resource: `Chapter:${cId}`,
      details: { novelId: nId, error: error instanceof Error ? error.message : String(error) },
      success: false,
      errorMsg: error instanceof Error ? error.message : String(error),
    }).catch((e) => console.error("Failed to log move-up error audit:", e));
  }

  return NextResponse.redirect(new URL(`/admin/novels/${nId}`, request.url));
}
