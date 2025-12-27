"use client";

import { useEffect } from "react";
import Link from "next/link";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-red-600">Something Went Wrong</h1>
          <p className="text-gray-600 mt-2">
            An unexpected error occurred in the admin panel.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-4 text-left">
          <p className="font-semibold text-red-900 text-sm">Error Details:</p>
          <p className="mt-2 font-mono text-xs text-red-800 break-all">
            {error.message}
          </p>
        </div>

        <div className="flex gap-3 flex-col">
          <button
            onClick={reset}
            className="px-6 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 transition"
          >
            Try Again
          </button>

          <Link
            href="/admin"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition"
          >
            Back to Admin
          </Link>

          <Link
            href="/"
            className="px-6 py-2 text-gray-500 hover:text-gray-700"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
