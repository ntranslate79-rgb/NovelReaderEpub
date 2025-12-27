import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateCsrfToken } from "@/lib/csrf";
import { CsrfInput } from "@/app/admin/components/FormComponents";

interface Props {
  params: Promise<{
    novelId: string;
  }>;
}

export default async function AdminChapterList({ params }: Props) {
  const { novelId } = await params;
  const id = Number(novelId);

  if (isNaN(id)) notFound();

  const novel = await prisma.novel.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { number: "asc" },
      },
    },
  });

  if (!novel) notFound();

  // Generate CSRF tokens for move forms
  const moveUpToken = generateCsrfToken();
  const moveDownToken = generateCsrfToken();

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">
        {novel.title} — Chapters
      </h2>

      <Link
        href={`/admin/novels/${novel.id}/new`}
        className="underline text-sm"
      >
        + New chapter
      </Link>

      <ul className="mt-6 space-y-3">
        {novel.chapters.map((chapter) => (
          <li
            key={chapter.id}
            className="flex justify-between items-center border p-3"
          >
            <span>
                Chapter {chapter.number}: {chapter.title}
            </span>

            <div className="flex gap-3 text-sm">
              {/* Move up */}
              <form
                action={`/admin/novels/${novel.id}/chapters/${chapter.id}/move-up`}
                method="post"
              >
                <CsrfInput token={moveUpToken} />
                <button className="underline">↑</button>
              </form>

              {/* Move down */}
              <form
                action={`/admin/novels/${novel.id}/chapters/${chapter.id}/move-down`}
                method="post"
              >
                <CsrfInput token={moveDownToken} />
                <button className="underline">↓</button>
              </form>

              <Link
                href={`/admin/novels/${novel.id}/chapters/${chapter.id}/edit`}
                className="underline"
              >
                Edit
              </Link>

              <Link
                href={`/admin/novels/${novel.id}/chapters/${chapter.id}/delete`}
                className="text-red-600 underline"
              >
                Delete
              </Link>
            </div>
           </li>
         ))}
       </ul>
    </div>
  );
}
