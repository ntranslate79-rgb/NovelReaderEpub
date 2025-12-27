import { prisma } from "@/lib/prisma";
import Link from "next/link";

// Admin pages should render dynamically to avoid DB connection during build
export const dynamic = "force-dynamic";

interface AdminNovelItem {
  id: number;
  title: string;
}

export default async function AdminNovelList() {
  const novels = (await prisma.novel.findMany({
    orderBy: { createdAt: "desc" },
  })) as AdminNovelItem[];

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Novels</h2>

      <ul className="space-y-3">
        {novels.map((novel) => (
          <li key={novel.id}>
            <Link
              href={`/admin/novels/${novel.id}`}
              className="underline"
            >
              {novel.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
