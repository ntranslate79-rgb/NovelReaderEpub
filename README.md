# Novel Reader EPUB Platform

A secure Next.js application for managing and reading EPUB novels with admin authentication, chapter management, and comprehensive audit logging.

## Features

- **Admin Authentication**: Credentials provider with database-backed accounts, OAuth (GitHub, Google), and rate-limited login attempts
- **EPUB Import**: Upload and parse EPUB files to automatically extract chapters
- **Chapter Management**: Create, edit, delete, and reorder chapters
- **CSRF Protection**: Token-based CSRF validation on all admin forms
- **Audit Logging**: Comprehensive logging of all admin actions (logins, EPUB imports, chapter edits)
- **Rate Limiting**: Protects login endpoint from brute force attacks
- **Image Optimization**: Automatic image resizing and WebP conversion using Sharp
- **Security Headers**: Built-in Next.js security best practices

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/novel_reader

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-generated-secret-here

# Admin credentials (for development/demo)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# OAuth Providers (optional)
GITHUB_ID=your-github-oauth-id
GITHUB_SECRET=your-github-oauth-secret
GOOGLE_ID=your-google-oauth-id
GOOGLE_SECRET=your-google-oauth-secret

# Environment
NODE_ENV=development
```

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) to access the admin panel.

**Demo Credentials:**
- Email: `admin@example.com`
- Password: `admin123`

## Development

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Lint Code

```bash
npm run lint
```

### Build for Production

```bash
npm run build
npm start
```

## Security Features

### CSRF Protection

All admin forms (chapter create/edit/delete, chapter reordering, sign-out) include CSRF tokens that are validated server-side. Tokens are:
- Generated on page load with a timestamp
- Valid for 1 hour
- Validated using timing-safe comparison to prevent timing attacks

**Example form with CSRF:**

```tsx
import { CsrfInput } from "@/app/admin/components/FormComponents";
import { generateCsrfToken } from "@/lib/csrf";

export default async function MyForm() {
  const csrfToken = generateCsrfToken();

  async function handleSubmit(formData: FormData) {
    "use server";
    const csrfToken = String(formData.get("_csrf") || "");
    if (!validateCsrfToken(csrfToken)) {
      throw new Error("Invalid CSRF token");
    }
    // Process form...
  }

  return (
    <form action={handleSubmit}>
      <CsrfInput token={csrfToken} />
      {/* form fields */}
    </form>
  );
}
```

### Rate Limiting

Login attempts are rate-limited to **5 attempts per 15 minutes** per email/IP combination. After exceeding the limit, users must wait for the window to reset.

**Implementation:** `lib/rate-limit.ts` (in-memory; for production, consider Redis)

### Audit Logging

All admin actions are logged to the database with:
- User ID (if logged in)
- Action type (LOGIN_ATTEMPT, EPUB_IMPORT, CHAPTER_CREATE, etc.)
- Resource identifier
- Timestamp
- IP address
- User agent
- Success/failure status
- Error messages (if any)

**Audit Log Model:**

```prisma
model AuditLog {
  id        Int               @id @default(autoincrement())
  adminId   Int?
  action    AuditActionType
  resource  String?           // e.g., "Chapter:123", "EPUB:456"
  details   String?           // JSON details
  ipAddress String?
  userAgent String?
  success   Boolean           @default(true)
  errorMsg  String?
  createdAt DateTime          @default(now())
}
```

### Password Hashing

Admin user passwords are hashed using **bcryptjs** with 10 salt rounds. Raw passwords are never stored or logged.

## API Endpoints

### Admin Endpoints

- `POST /api/admin/epub` - Upload and import EPUB file
- `POST /admin/novels/{novelId}/chapters/{chapterId}/move-up` - Move chapter up
- `POST /admin/novels/{novelId}/chapters/{chapterId}/move-down` - Move chapter down

All endpoints require:
1. Valid NextAuth session
2. Valid CSRF token in request body

### Public Endpoints

- `GET /novels` - List all novels
- `GET /novels/{slug}` - View novel details
- `GET /chapter/{id}` - View chapter content

## Project Structure

```
novel-reader/
├── app/
│   ├── admin/                 # Admin panel pages
│   │   ├── components/        # Shared admin components
│   │   ├── epub/              # EPUB import page
│   │   ├── novels/            # Novel management
│   │   └── login/             # Login page
│   ├── api/
│   │   └── admin/epub/        # EPUB upload endpoint
│   └── chapter/               # Public chapter viewing
├── lib/
│   ├── csrf.ts                # CSRF token utilities
│   ├── audit.ts               # Audit logging
│   ├── rate-limit.ts          # Rate limiting
│   ├── admin-user.ts          # Admin user utilities
│   ├── image-optimization.ts  # Image processing
│   └── epub/                  # EPUB parsing utilities
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── __tests__/                 # Jest tests
├── auth.config.ts             # NextAuth configuration
└── middleware.ts              # Request middleware
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | NextAuth secret (generate: `openssl rand -base64 32`) |
| `ADMIN_EMAIL` | ❌ | Demo admin email (development) |
| `ADMIN_PASSWORD` | ❌ | Demo admin password (development) |
| `GITHUB_ID` | ❌ | GitHub OAuth client ID |
| `GITHUB_SECRET` | ❌ | GitHub OAuth client secret |
| `GOOGLE_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_SECRET` | ❌ | Google OAuth client secret |
| `NODE_ENV` | ✅ | `development`, `production`, or `test` |

## OAuth Setup

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL to `http://localhost:3000/api/auth/callback/github` (adjust for production)
4. Copy Client ID and Client Secret to `.env.local`

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project and OAuth 2.0 credential
3. Set authorized redirect URI to `http://localhost:3000/api/auth/callback/google` (adjust for production)
4. Copy Client ID and Client Secret to `.env.local`

## Troubleshooting

### CSRF Token Errors

**"Invalid or expired CSRF token"** usually means:
- Token expired (max 1 hour)
- Page was refreshed before submission
- Token was modified

**Solution:** Refresh the page and resubmit the form.

### Rate Limited

**"Too many login attempts"** means you exceeded 5 attempts in 15 minutes.

**Solution:** Wait 15 minutes or check `/admin/login?error=` for details.

### Database Connection Errors

Ensure `DATABASE_URL` is correct and PostgreSQL is running:

```bash
# Test connection
npx prisma db execute --stdin < /dev/null
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [CSRF Protection Best Practices](https://owasp.org/www-community/attacks/csrf)

## License

MIT
