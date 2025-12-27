export default function ChapterLoading() {
  return (
    <main className="max-w-3xl mx-auto p-6 animate-pulse">
      {/* Reading progress bar placeholder */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-20" />

      {/* Sticky top bar skeleton */}
      <div className="sticky top-0 bg-white py-4 mb-6 border-b z-10 space-y-3">
        {/* Chapter title skeleton */}
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
        </div>

        {/* Reading time and font controls skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <article className="space-y-4">
        {/* Simulate 8 lines of text */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-full" />
            <div className="h-5 bg-gray-200 rounded w-5/6" />
          </div>
        ))}
      </article>

      {/* Sticky bottom navigation skeleton */}
      <div className="flex justify-between mt-12 text-sm sticky bottom-0 bg-white py-4 border-t">
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
    </main>
  );
}
