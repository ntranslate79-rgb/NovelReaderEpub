"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="p-6">
      <h2 className="text-xl font-bold">Something went wrong</h2>

      <p className="text-muted-foreground mt-2">
        {error.message}
      </p>

      <button
        onClick={() => reset()}
        className="mt-4 text-blue-600 underline"
      >
        Try again
      </button>
    </main>
  );
}
