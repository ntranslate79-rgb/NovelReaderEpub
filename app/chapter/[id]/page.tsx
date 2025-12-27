import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ChapterReader from "./reader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { id } = await params; // ✅ UNWRAP params
  const chapterId = Number(id);

  if (isNaN(chapterId)) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
  });
  if (!chapter) notFound();

  const prevChapter = await prisma.chapter.findFirst({
    where: {
      novelId: chapter.novelId,
      number: { lt: chapter.number },
    },
    orderBy: { number: "desc" },
  });

  const nextChapter = await prisma.chapter.findFirst({
    where: {
      novelId: chapter.novelId,
      number: { gt: chapter.number },
    },
    orderBy: { number: "asc" },
  });

  return (
    <ChapterReader
      chapter={chapter}
      prevChapter={prevChapter}
      nextChapter={nextChapter}
    />
  );
}
