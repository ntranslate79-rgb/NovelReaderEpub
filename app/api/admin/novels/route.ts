import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * GET /api/admin/novels
 * Returns a list of all novels for admin panel
 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const novels = await prisma.novel.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(novels);
  } catch (error) {
    console.error("Failed to fetch novels:", error);
    return NextResponse.json(
      { error: "Failed to fetch novels" },
      { status: 500 }
    );
  }
}
