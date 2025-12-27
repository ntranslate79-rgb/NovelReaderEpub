"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";

// Local minimal Chapter type used in the client reader component
interface ChapterLocal {
  id: number;
  contentHtml: string | null;
  number: number;
  title: string;
}

interface ReaderProps {
  chapter: ChapterLocal;
  prevChapter: ChapterLocal | null;
  nextChapter: ChapterLocal | null;
}

export default function ChapterReader({
  chapter,
  prevChapter,
  nextChapter,
}: ReaderProps) {
  /* -------- Sanitize HTML content for security -------- */
  const sanitizedContent = useMemo(() => {
    return sanitizeHtml(chapter.contentHtml || "", {
      allowedTags: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "i",
        "b",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "ol",
        "ul",
        "li",
        "a",
        "span",
        "div",
        "hr",
        "sup",
        "sub",
        "img",
      ],
      allowedAttributes: {
        a: ["href"],
        img: ["src", "alt", "title", "width", "height"],
      },
      disallowedTagsMode: "discard",
    });
  }, [chapter.contentHtml]);

  /* ---------------- Reading progress ---------------- */
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Debounce scroll event to prevent excessive updates
    let timeoutId: NodeJS.Timeout;

    const onScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollTop = window.scrollY;
        const height =
          document.documentElement.scrollHeight - window.innerHeight;
        setProgress(height > 0 ? (scrollTop / height) * 100 : 0);
      }, 50);
    };

    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  /* ---------------- Reading time ---------------- */
  const words =
    sanitizedContent
      ?.replace(/<[^>]+>/g, "")
      .split(/\s+/).length ?? 0;

  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  /* -------- Font size with localStorage persistence -------- */
  // Initialize font size from localStorage synchronously to avoid cascading renders
  const initialFontSize = (() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("reader-fontSize") : null;
      const n = raw ? Number(raw) : NaN;
      return !isNaN(n) ? n : 18;
    } catch {
      return 18;
    }
  })();

  const [fontSize, setFontSize] = useState<number>(initialFontSize);

  const handleFontSizeChange = (newSize: number) => {
    const clamped = Math.max(14, Math.min(28, newSize));
    setFontSize(clamped);
    localStorage.setItem("reader-fontSize", String(clamped));
  };

  /* ---------------- Remember scroll position ---------------- */
  useEffect(() => {
    const key = `scroll-${chapter.id}`;
    const saved = sessionStorage.getItem(key);
    if (saved) window.scrollTo(0, Number(saved));

    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
  }, [chapter.id]);

  /* ---------------- Keyboard navigation ---------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevChapter) {
        window.location.href = `/chapter/${prevChapter.id}`;
      }
      if (e.key === "ArrowRight" && nextChapter) {
        window.location.href = `/chapter/${nextChapter.id}`;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevChapter, nextChapter]);

  /* ---------------- Mobile swipe navigation ---------------- */
  useEffect(() => {
    let startX = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const delta = e.changedTouches[0].clientX - startX;
      if (delta > 80 && prevChapter) {
        window.location.href = `/chapter/${prevChapter.id}`;
      }
      if (delta < -80 && nextChapter) {
        window.location.href = `/chapter/${nextChapter.id}`;
      }
    };

    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [prevChapter, nextChapter]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-20">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sticky top bar */}
      <div className="sticky top-0 bg-background py-4 mb-6 border-b z-10">
        <h1 className="text-xl font-semibold">
          Chapter {chapter.number}: {chapter.title}
        </h1>

        <div className="flex justify-between items-center mt-2 text-sm">
          <span className="text-muted-foreground">
            ⏱ {readingMinutes} min read
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => handleFontSizeChange(fontSize - 2)}
              aria-label="Decrease font size"
            >
              A−
            </button>
            <button
              onClick={() => handleFontSizeChange(fontSize + 2)}
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Chapter content */}
      <article
        className="prose prose-lg dark:prose-invert max-w-none"
        style={{ fontSize }}
      >
        {sanitizedContent ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        ) : (
          <p className="text-muted-foreground">
            This chapter has no content yet.
          </p>
        )}
      </article>

      {/* Sticky bottom navigation */}
      <nav className="flex justify-between mt-12 text-sm sticky bottom-0 bg-background py-4 border-t">
        {prevChapter ? (
          <Link href={`/chapter/${prevChapter.id}`} className="hover:underline">
            ← Previous
          </Link>
        ) : (
          <span />
        )}

        {nextChapter && (
          <Link href={`/chapter/${nextChapter.id}`} className="hover:underline">
            Next →
          </Link>
        )}
      </nav>
    </main>
  );
}
