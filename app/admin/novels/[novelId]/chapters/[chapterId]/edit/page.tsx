import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import {
  AdminFormContainer,
  AdminForm,
  FormField,
  FormButtonGroup,
  CsrfInput,
} from "@/app/admin/components/FormComponents";
import { generateCsrfToken } from "@/lib/csrf";
import { validateCsrfToken } from "@/lib/csrf";
import { logAuditAction } from "@/lib/audit";

interface Props {
  params: Promise<{
    novelId: string;
    chapterId: string;
  }>;
}

export default async function EditChapterPage({ params }: Props) {
  const { novelId, chapterId } = await params;

  const nId = Number(novelId);
  const cId = Number(chapterId);

  if (isNaN(nId) || isNaN(cId)) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: { id: cId },
  });

  if (!chapter || chapter.novelId !== nId) notFound();

  async function updateChapter(formData: FormData) {
    "use server";

    const csrfToken = String(formData.get("_csrf") || "");
    
    // Validate CSRF token
    if (!validateCsrfToken(csrfToken)) {
      throw new Error("Invalid or expired CSRF token. Please refresh and try again.");
    }

    const title = String(formData.get("title") || "").trim();
    const number = Number(formData.get("number"));
    const content = String(formData.get("content") || "").trim();

    // Validation
    if (!title || title.length < 1) {
      throw new Error("Title is required and must not be empty");
    }

    if (title.length > 255) {
      throw new Error("Title must be less than 255 characters");
    }

    if (isNaN(number) || number < 1) {
      throw new Error("Chapter number must be a positive number");
    }

    if (content.length > 1000000) {
      throw new Error("Content is too long (max 1MB)");
    }

    // Check for duplicate chapter number (excluding current chapter)
    const existing = await prisma.chapter.findFirst({
      where: {
        novelId: nId,
        number: number,
        NOT: { id: cId },
      },
    });

    if (existing) {
      throw new Error(
        `Chapter number ${number} already exists for this novel`
      );
    }

    try {
      await prisma.chapter.update({
        where: { id: cId },
        data: {
          title,
          number,
          contentHtml: content,
        },
      });

      // Log the update action
      await logAuditAction({
        action: "CHAPTER_UPDATE",
        resource: `Chapter:${cId}`,
        details: { novelId: nId, title, number },
        success: true,
      });

      redirect(`/admin/novels/${nId}`);
    } catch (error) {
      await logAuditAction({
        action: "CHAPTER_UPDATE",
        resource: `Chapter:${cId}`,
        details: { novelId: nId, title, number },
        success: false,
        errorMsg: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // referenced by the form action attribute
  void updateChapter;

  // Generate CSRF token for the form
  const csrfToken = generateCsrfToken();

  return (
    <AdminFormContainer
      title={`Edit Chapter ${chapter.number}`}
      subtitle={`Novel: "${chapter.title}"`}
    >
      <AdminForm>
        <CsrfInput token={csrfToken} />
        <FormField
          label="Chapter Title"
          name="title"
          placeholder="e.g., The Beginning"
          defaultValue={chapter.title}
          required
          maxLength={255}
        />

        <FormField
          label="Chapter Number"
          name="number"
          type="number"
          defaultValue={chapter.number}
          required
        />

        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-2">
            Content (HTML)
          </label>
          <textarea
            id="content"
            name="content"
            rows={15}
            defaultValue={chapter.contentHtml ?? ""}
            placeholder="Paste HTML content here..."
            maxLength={1000000}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="mt-1 text-xs text-gray-500">
            Supports HTML formatting (p, strong, em, a, blockquote, etc.)
          </p>
        </div>

        <FormButtonGroup
          submitLabel="Save Changes"
          cancelHref={`/admin/novels/${nId}`}
        />
      </AdminForm>
    </AdminFormContainer>
  );
}
