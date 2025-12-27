"use client";

import { useState, useEffect } from "react";

interface Novel {
  id: number;
  title: string;
}

export default function AdminEpubPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [novelId, setNovelId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch novels on mount
  useEffect(() => {
    async function fetchNovels() {
      try {
        const res = await fetch("/api/admin/novels");
        if (!res.ok) throw new Error("Failed to fetch novels");
        const data = await res.json();
        setNovels(data);
        if (data.length > 0) {
          setNovelId(data[0].id);
        }
      } catch {
        setStatus("❌ Failed to load novels");
      } finally {
        setIsLoading(false);
      }
    }

    fetchNovels();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setStatus("❌ Please select a file");
      return;
    }

    if (!novelId) {
      setStatus("❌ Please select a novel");
      return;
    }

    setIsImporting(true);
    setStatus("📚 Importing EPUB…");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("novelId", String(novelId));

    try {
      const res = await fetch("/api/admin/epub", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(`❌ ${data.error || "Import failed"}`);
        return;
      }

      setStatus(
        `✅ Successfully imported ${data.chaptersImported} chapter${data.chaptersImported !== 1 ? "s" : ""}`
      );
      setFile(null);

      // Reset file input
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch {
      setStatus("❌ Network error. Please try again.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import EPUB</h1>
        <p className="text-gray-600 mt-1">
          Upload an EPUB file to import chapters into a novel
        </p>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading novels…</div>
      ) : novels.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
          ⚠️ No novels found. Please create a novel before importing EPUB.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded border">
          {/* Novel Selector */}
          <div>
            <label htmlFor="novel" className="block text-sm font-medium mb-2">
              Select Novel <span className="text-red-500">*</span>
            </label>
            <select
              id="novel"
              value={novelId || ""}
              onChange={(e) => setNovelId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded bg-white"
              required
            >
              <option value="">-- Choose a novel --</option>
              {novels.map((novel) => (
                <option key={novel.id} value={novel.id}>
                  {novel.title}
                </option>
              ))}
            </select>
          </div>

          {/* File Input */}
          <div>
            <label htmlFor="file" className="block text-sm font-medium mb-2">
              EPUB File <span className="text-red-500">*</span>
            </label>
            <input
              id="file"
              type="file"
              accept=".epub"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-black file:text-white
                hover:file:bg-gray-800"
              required
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isImporting || !file || !novelId}
            className="w-full px-4 py-2 bg-black text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition"
          >
            {isImporting ? "Importing…" : "Import EPUB"}
          </button>
        </form>
      )}

      {/* Status Message */}
      {status && (
        <div
          className={`p-4 rounded ${
            status.includes("✅")
              ? "bg-green-50 text-green-800 border border-green-200"
              : status.includes("❌")
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
}
