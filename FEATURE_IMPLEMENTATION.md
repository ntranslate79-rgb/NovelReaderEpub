# Implementation Guide: New Reader Features

This guide walks through implementing the new reader features added in Phase 5.

---

## Overview of New Models

The database schema has been expanded with 6 new models:

1. **User** - Reader accounts (separate from AdminUser)
2. **UserPreferences** - User theme/font preferences
3. **ReadingProgress** - Track where users left off
4. **Bookmark** - Save positions in chapters
5. **Rating** - 1-5 star ratings for novels
6. **Review** - Text reviews with approval moderation

---

## 1. User Authentication for Readers

### Update Auth Configuration

Update `auth.config.ts` to support reader authentication:

```typescript
// Add to auth providers
providers: [
  // ... existing providers ...
  
  // Email/password for readers
  CredentialsProvider({
    name: "Email (Reader)",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || !user.passwordHash) return null;

      const passwordMatch = await bcryptjs.compare(
        credentials.password as string,
        user.passwordHash
      );

      if (!passwordMatch) return null;

      return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
        role: "reader",
      };
    },
  }),
],

callbacks: {
  async jwt({ token, user, account }) {
    if (user) {
      token.id = user.id;
      token.role = user.role || "reader";
    }
    return token;
  },
  
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
    }
    return session;
  },
},
```

### Create Reader Registration Page

Create `app/(reader)/register/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import bcryptjs from "bcryptjs";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">Create Reader Account</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          required
          className="w-full px-4 py-2 border rounded"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="w-full px-4 py-2 border rounded"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          minLength={8}
          required
          className="w-full px-4 py-2 border rounded"
        />
        
        {error && <div className="text-red-600">{error}</div>}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
    </div>
  );
}
```

### Create Registration API Endpoint

Create `app/api/auth/register/route.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validate inputs
    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        provider: "credentials",
        preferences: {
          create: {},
        },
      },
    });

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 2. Reading Progress Tracking

### Create Reading Progress Service

Create `lib/reading-progress.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function updateReadingProgress(
  userId: number,
  novelId: number,
  chapterId: number,
  progress: number
) {
  return await prisma.readingProgress.upsert({
    where: { userId_novelId: { userId, novelId } },
    update: {
      chapterId,
      progress: Math.min(100, Math.max(0, progress)),
      lastReadAt: new Date(),
    },
    create: {
      userId,
      novelId,
      chapterId,
      progress,
    },
  });
}

export async function getReadingProgress(userId: number, novelId: number) {
  return await prisma.readingProgress.findUnique({
    where: { userId_novelId: { userId, novelId } },
  });
}

export async function getReadingHistory(userId: number, limit = 10) {
  return await prisma.readingProgress.findMany({
    where: { userId },
    orderBy: { lastReadAt: "desc" },
    take: limit,
    include: {
      novel: true,
      chapter: true,
    },
  });
}
```

### Update Chapter Reader Page

Modify `app/chapter/[id]/page.tsx` to save progress:

```typescript
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { updateReadingProgress } from "@/lib/reading-progress";

export default function ChapterReader({ chapter, novel }) {
  const { data: session } = useSession();

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!session?.user) return;

    const interval = setInterval(async () => {
      const scrollProgress = Math.round(
        (window.scrollY / document.documentElement.scrollHeight) * 100
      );

      await updateReadingProgress(
        parseInt(session.user.id),
        novel.id,
        chapter.id,
        scrollProgress
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [session, novel.id, chapter.id]);

  return (
    <div>
      {/* Chapter content */}
    </div>
  );
}
```

---

## 3. Ratings and Reviews

### Create Ratings Service

Create `lib/ratings.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function rateNovel(userId: number, novelId: number, score: number) {
  const rating = await prisma.rating.upsert({
    where: { userId_novelId: { userId, novelId } },
    update: { score },
    create: { userId, novelId, score },
  });

  // Update cached average rating
  const avgRating = await prisma.rating.aggregate({
    where: { novelId },
    _avg: { score: true },
  });

  await prisma.novel.update({
    where: { id: novelId },
    data: { avgRating: avgRating._avg.score || 0 },
  });

  return rating;
}

export async function createReview(
  userId: number,
  novelId: number,
  title: string,
  content: string
) {
  return await prisma.review.create({
    data: {
      userId,
      novelId,
      title,
      content,
    },
  });
}

export async function getNovelRatings(novelId: number, limit = 5) {
  return await prisma.review.findMany({
    where: { novelId, approved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true },
  });
}
```

### Create Rating Component

Create `app/components/RatingWidget.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { rateNovel } from "@/lib/ratings";

export function RatingWidget({ novelId, initialRating }) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(initialRating || 0);
  const [loading, setLoading] = useState(false);

  const handleRate = async (score: number) => {
    if (!session?.user) return;

    setLoading(true);
    try {
      await rateNovel(parseInt(session.user.id), novelId, score);
      setRating(score);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <p>Sign in to rate this novel</p>;
  }

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          disabled={loading}
          className={`text-2xl ${
            star <= rating ? "text-yellow-400" : "text-gray-300"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
```

---

## 4. Bookmarks

### Create Bookmark Service

Create `lib/bookmarks.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function createBookmark(
  userId: number,
  chapterId: number,
  position: number,
  label?: string
) {
  return await prisma.bookmark.create({
    data: {
      userId,
      chapterId,
      position,
      label,
    },
  });
}

export async function getUserBookmarks(userId: number) {
  return await prisma.bookmark.findMany({
    where: { userId },
    include: {
      chapter: {
        include: { novel: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteBookmark(bookmarkId: number) {
  return await prisma.bookmark.delete({
    where: { id: bookmarkId },
  });
}
```

---

## 5. User Preferences

### Create Preferences Service

Create `lib/user-preferences.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function updateUserPreferences(
  userId: number,
  preferences: {
    theme?: string;
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    language?: string;
  }
) {
  return await prisma.userPreferences.upsert({
    where: { userId },
    update: preferences,
    create: { userId, ...preferences },
  });
}

export async function getUserPreferences(userId: number) {
  return await prisma.userPreferences.findUnique({
    where: { userId },
  });
}
```

---

## 6. Search Implementation

### Create Search Service

Create `lib/search.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function searchNovels(query: string, limit = 20) {
  if (!query.trim()) return [];

  return await prisma.novel.findMany({
    where: {
      OR: [
        { title: { search: query } },
        { description: { search: query } },
      ],
    },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      status: true,
      views: true,
      avgRating: true,
    },
  });
}

export async function searchChapters(novelId: number, query: string, limit = 20) {
  return await prisma.chapter.findMany({
    where: {
      novelId,
      OR: [
        { title: { search: query } },
        { contentHtml: { search: query } },
      ],
    },
    take: limit,
    select: {
      id: true,
      number: true,
      title: true,
    },
  });
}
```

---

## Database Migrations

All database schema changes have been applied via:

```bash
npx prisma migrate dev --name add_reader_features
```

To sync your database:

```bash
npx prisma db push
```

To generate Prisma Client with new models:

```bash
npx prisma generate
```

---

## Testing the New Features

### 1. Test User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reader@example.com",
    "password": "SecurePassword123",
    "name": "Test Reader"
  }'
```

### 2. Test Rating System

```bash
curl -X POST http://localhost:3000/api/novels/1/rate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "score": 5
  }'
```

### 3. Test Search

```bash
curl "http://localhost:3000/api/search?q=test&type=novels"
```

---

## Next Steps

1. **Create reader dashboard** - Show reading history, bookmarks, ratings
2. **Implement recommendations** - Based on reading history and ratings
3. **Add notifications** - New chapters, reviews, recommendations
4. **Create admin panel** - Moderate reviews, manage users
5. **Add social features** - Share recommendations, follow users

---

## Performance Considerations

- Add database indexes for search queries
- Cache average ratings on novel updates
- Implement pagination for reading history
- Use read replicas for search queries
- Add full-text search indexes in PostgreSQL

```sql
-- PostgreSQL full-text search indexes
CREATE INDEX novels_search_idx 
ON "Novel" USING GIN (to_tsvector('english', "title" || ' ' || COALESCE("description", '')));

CREATE INDEX chapters_search_idx 
ON "Chapter" USING GIN (to_tsvector('english', "title" || ' ' || COALESCE("contentHtml", '')));
```

All feature implementations are ready to integrate! 🚀
