import { prisma } from "../lib/prisma";

async function main() {
  console.log("🌱 SEED STARTED");

  // 1️⃣ Create or get the novel
  const novel = await prisma.novel.upsert({
    where: { slug: "test-novel" },
    update: {},
    create: {
      slug: "test-novel",
      title: "Test Novel",
      description: "This is a test novel",
      status: "ONGOING",
      views: 0,
    },
  });

  // 2️⃣ Create chapters only if none exist
  const existingChapters = await prisma.chapter.count({
    where: { novelId: novel.id },
  });

  if (existingChapters === 0) {
    await prisma.chapter.createMany({
      data: [
        {
          novelId: novel.id,
          number: 1,
          title: "The Beginning",
          contentHtml: "<p>This is chapter one.</p>",
        },
        {
          novelId: novel.id,
          number: 2,
          title: "The Journey Continues",
          contentHtml: "<p>This is chapter two.</p>",
        },
      ],
    });

    console.log("📘 Chapters created");
  } else {
    console.log("📘 Chapters already exist, skipping");
  }

  console.log("✅ SEED FINISHED");
}

main()
  .catch((e) => {
    console.error("❌ SEED ERROR", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
