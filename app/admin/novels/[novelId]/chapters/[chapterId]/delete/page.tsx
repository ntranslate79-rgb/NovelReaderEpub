import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { CsrfInput } from "@/app/admin/components/FormComponents";
import { generateCsrfToken } from "@/lib/csrf";
import { validateCsrfToken } from "@/lib/csrf";
import { logAuditAction } from "@/lib/audit";

interface Props {
  params: Promise<{
    novelId: string;
    chapterId: string;
  }>;
}

export default async function DeleteChapterPage({ params }: Props) {
  const { novelId, chapterId } = await params;

  const nId = Number(novelId);
  const cId = Number(chapterId);

  if (isNaN(nId) || isNaN(cId)) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: { id: cId },
  });

  if (!chapter || chapter.novelId !== nId) notFound();

  async function deleteChapter(formData: FormData) {
    "use server";

    const csrfToken = String(formData.get("_csrf") || "");
    
    // Validate CSRF token
    if (!validateCsrfToken(csrfToken)) {
      throw new Error("Invalid or expired CSRF token. Please refresh and try again.");
    }

    try {
      await prisma.chapter.delete({
        where: { id: cId },
      });

      // Log the delete action
      await logAuditAction({
        action: "CHAPTER_DELETE",
        resource: `Chapter:${cId}`,
        details: { novelId: nId, chapterId: cId },
        success: true,
      });

      redirect(`/admin/novels/${nId}`);
    } catch (error) {
      await logAuditAction({
        action: "CHAPTER_DELETE",
        resource: `Chapter:${cId}`,
        details: { novelId: nId, chapterId: cId },
        success: false,
        errorMsg: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Generate CSRF token for the form
  const csrfToken = generateCsrfToken();

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-semibold text-red-600 mb-4">
        Delete Chapter
      </h2>

      <p className="mb-6">
        Are you sure you want to delete{" "}
        <strong>
          Chapter {chapter.number}: {chapter.title}
        </strong>
        ?
      </p>

      <form action={deleteChapter} className="flex gap-4">
        <CsrfInput token={csrfToken} />
        <button
          className="px-4 py-2 bg-red-600 text-white"
        >
          Yes, Delete
        </button>

        <a
          href={`/admin/novels/${nId}`}
          className="px-4 py-2 border"
        >
          Cancel
        </a>
      </form>
    </div>
  );
}
