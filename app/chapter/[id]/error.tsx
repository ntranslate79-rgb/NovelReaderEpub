"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChapterError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Chapter loading error:", error);
  }, [error]);

  return (
    <main className="max-w-3xl mx-auto p-6 text-center">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-red-600">
            Failed to Load Chapter
          </h1>
          <p className="text-gray-600 mt-2">
            Sorry, we encountered an error loading this chapter.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800">
          <p className="font-semibold">Error details:</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 transition"
          >
            Try Again
          </button>

          <Link
            href="/novels"
            className="px-6 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition"
          >
            Back to Novels
          </Link>
        </div>
      </div>
    </main>
  );
}
