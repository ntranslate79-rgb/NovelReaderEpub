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
  params: Promise<{ novelId: string }>;
}

export default async function NewChapterPage({ params }: Props) {
  const { novelId } = await params;
  const id = Number(novelId);

  if (isNaN(id)) notFound();

  const novel = await prisma.novel.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { number: "desc" },
        take: 1,
      },
    },
  });

  if (!novel) notFound();

  const nextNumber = novel.chapters[0]?.number
    ? novel.chapters[0].number + 1
    : 1;

  async function createChapter(formData: FormData) {
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

    // Check for duplicate chapter number
    const existing = await prisma.chapter.findUnique({
      where: {
        novelId_number: {
          novelId: id,
          number: number,
        },
      },
    });

    if (existing) {
      throw new Error(
        `Chapter number ${number} already exists for this novel`
      );
    }

    try {
      const chapter = await prisma.chapter.create({
        data: {
          title,
          number,
          contentHtml: content,
          novelId: id,
        },
      });

      // Log the create action
      await logAuditAction({
        action: "CHAPTER_CREATE",
        resource: `Chapter:${chapter.id}`,
        details: { novelId: id, title, number },
        success: true,
      });

      redirect(`/admin/novels/${id}`);
    } catch (error) {
      await logAuditAction({
        action: "CHAPTER_CREATE",
        resource: `Novel:${id}`,
        details: { title, number },
        success: false,
        errorMsg: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // referenced by form action
  void createChapter;

  // Generate CSRF token for the form
  const csrfToken = generateCsrfToken();

  return (
    <AdminFormContainer
      title="Create New Chapter"
      subtitle={`Novel: "${novel.title}"`}
    >
      <AdminForm>
        <CsrfInput token={csrfToken} />
        <FormField
          label="Chapter Title"
          name="title"
          placeholder="e.g., The Beginning"
          required
          maxLength={255}
        />

        <FormField
          label="Chapter Number"
          name="number"
          type="number"
          defaultValue={nextNumber}
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
            placeholder="Paste HTML content here..."
            maxLength={1000000}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="mt-1 text-xs text-gray-500">
            Supports HTML formatting (p, strong, em, a, blockquote, etc.)
          </p>
        </div>

        <FormButtonGroup
          submitLabel="Create Chapter"
          cancelHref={`/admin/novels/${id}`}
        />
      </AdminForm>
    </AdminFormContainer>
  );
}
