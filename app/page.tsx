import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Novel Reader",
  description: "Browse and read novels online",
};

export default function HomePage() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold">Novel Reader</h1>

      <p className="mt-2 text-muted-foreground">
        Browse and read novels
      </p>

      <Link
        href="/novels"
        className="inline-block mt-6 underline"
      >
        Go to novels →
      </Link>
    </main>
  );
}
