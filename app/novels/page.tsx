import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Novel Reader",
  description: "Browse and read novels online",
};

export default async function HomePage() {
  const novels = await prisma.novel.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-2">Novel Reader</h1>
      <p className="text-muted-foreground mb-6">
        Browse and read novels
      </p>

      {/* Empty state */}
      {novels.length === 0 && (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-muted-foreground">
            No novels yet.
          </p>
          <p className="text-sm mt-2">
            Seed the database to get started.
          </p>
        </div>
      )}

      {/* Novel list */}
      <ul className="space-y-4">
        {novels.map((novel) => (
          <li key={novel.id} className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold">
              <Link
                href={`/novels/${novel.slug}`}
                className="hover:underline"
              >
                {novel.title}
              </Link>
            </h2>

            <p className="text-sm text-muted-foreground">
              {novel.description}
            </p>

            <p className="text-xs mt-2">
              Status: <b>{novel.status}</b> · Views: {novel.views}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
