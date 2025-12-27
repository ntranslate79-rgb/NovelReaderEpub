import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/* -----------------------------
   Dynamic SEO metadata
-------------------------------- */
interface MetadataProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(
  { params }: MetadataProps
): Promise<Metadata> {
  const { slug } = await params;

  const novel = await prisma.novel.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
    },
  });

  if (!novel) {
    return {
      title: "Novel not found | Novel Reader",
    };
  }

  return {
    title: `${novel.title} | Novel Reader`,
    description: novel.description ?? "",
  };
}

/* -----------------------------
   Page component
-------------------------------- */
interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NovelPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const novel = await prisma.novel.findUnique({
    where: { slug },
  });

  if (!novel) {
    notFound();
  }

  // ✅ Fetch chapters AFTER novel exists
  const chapters = await prisma.chapter.findMany({
    where: { novelId: novel.id },
    orderBy: { number: "asc" },
  });

  // Increment views safely using ID
  const updatedNovel = await prisma.novel.update({
    where: { id: novel.id },
    data: {
      views: { increment: 1 },
    },
  });

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold">{updatedNovel.title}</h1>

      <p className="text-muted-foreground mt-2">
        {updatedNovel.description}
      </p>

      <div className="mt-4 text-sm">
        <p>Status: <b>{updatedNovel.status}</b></p>
        <p>Views: {updatedNovel.views}</p>
      </div>

      {/* ✅ Chapter list */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Chapters</h2>

        {chapters.length === 0 ? (
          <p className="text-muted-foreground">
            No chapters available yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <a
                  href={`/chapter/${chapter.id}`}
                  className="hover:underline"
                >
                  Chapter {chapter.number}: {chapter.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
