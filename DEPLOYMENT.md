# Novel Reader: Production Deployment & Feature Expansion Guide

## 🎯 Phase 5: Production Ready Expansion

This guide covers deploying to production and adding high-impact features.

---

## Part 1: New Features Overview

### Tier 1: Core Reader Features (High Impact, Medium Effort)

#### 1. **Reading History & Bookmarks** ⭐⭐⭐
- Track where user left off
- Resume reading automatically
- Save bookmarks for quick navigation
- Sync across devices

**Schema additions needed:**
```prisma
model ReadingProgress {
  id          Int      @id @default(autoincrement())
  userId      Int
  novelId     Int
  chapterId   Int
  progress    Int      // 0-100 percentage
  lastReadAt  DateTime @default(now()) @updatedAt
  
  user   User   @relation(fields: [userId], references: [id])
  novel  Novel  @relation(fields: [novelId], references: [id])
  chapter Chapter @relation(fields: [chapterId], references: [id])
  
  @@unique([userId, novelId])
}

model Bookmark {
  id        Int      @id @default(autoincrement())
  userId    Int
  chapterId Int
  position  Int      // Character position in chapter
  createdAt DateTime @default(now())
  
  user    User    @relation(fields: [userId], references: [id])
  chapter Chapter @relation(fields: [chapterId], references: [id])
}
```

#### 2. **User Accounts for Readers** ⭐⭐⭐
- Separate from admin users
- Google/GitHub OAuth support
- Email registration
- Reader preferences (theme, font size, language)

**Schema additions:**
```prisma
model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  name          String?
  image         String?
  passwordHash  String?  // Optional if using OAuth
  provider      String?  // "credentials", "google", "github"
  
  preferences   UserPreferences?
  readingHistory ReadingProgress[]
  bookmarks     Bookmark[]
  ratings       Rating[]
  reviews       Review[]
  
  @@index([email])
}

model UserPreferences {
  id              Int     @id @default(autoincrement())
  userId          Int     @unique
  theme           String  @default("light") // light, dark, sepia
  fontSize        Int     @default(16)      // 12-24
  fontFamily      String  @default("sans")  // sans, serif, mono
  language        String  @default("en")
  
  user User @relation(fields: [userId], references: [id])
}
```

#### 3. **Ratings & Reviews System** ⭐⭐⭐
- 5-star ratings
- Text reviews
- Helpful voting
- Admin moderation

**Schema:**
```prisma
model Rating {
  id        Int      @id @default(autoincrement())
  userId    Int
  novelId   Int
  score     Int      // 1-5
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user  User   @relation(fields: [userId], references: [id])
  novel Novel  @relation(fields: [novelId], references: [id])
  
  @@unique([userId, novelId])
  @@index([novelId])
}

model Review {
  id        Int      @id @default(autoincrement())
  userId    Int
  novelId   Int
  title     String
  content   String   @db.Text
  helpful   Int      @default(0)
  approved  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user  User   @relation(fields: [userId], references: [id])
  novel Novel  @relation(fields: [novelId], references: [id])
  
  @@index([novelId])
  @@index([userId])
}
```

#### 4. **Full-Text Search** ⭐⭐⭐
- Search novels by title/author
- Search within chapters
- Filters (status, rating, genre)
- PostgreSQL full-text search

**Implementation:**
```sql
-- PostgreSQL full-text search index
CREATE INDEX novels_search_idx 
ON "Novel" USING GIN (to_tsvector('english', "title" || ' ' || COALESCE("description", '')));

CREATE INDEX chapters_search_idx 
ON "Chapter" USING GIN (to_tsvector('english', "title" || ' ' || COALESCE("contentHtml", '')));
```

---

### Tier 2: Advanced Features (Medium Impact, High Effort)

#### 5. **Recommendation System**
- Similar novels based on reading history
- Popular/trending novels
- Machine learning suggestions (future)

#### 6. **Comments & Discussion**
- Chapter-level comments
- User-to-user interaction
- Threading support

#### 7. **Notification System**
- New chapter alerts
- Review notifications
- Email digests

---

## Part 2: Production Deployment

### Option A: Vercel Deployment (Recommended - Easiest)

**Advantages:**
- Zero-config deployment
- Automatic scaling
- Built-in CDN
- GitHub integration
- Free tier available

**Steps:**

1. **Create Vercel Account**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add DATABASE_URL
   vercel env add NEXTAUTH_SECRET
   vercel env add NEXTAUTH_URL="https://your-domain.com"
   vercel env add GITHUB_ID
   vercel env add GITHUB_SECRET
   vercel env add GOOGLE_ID
   vercel env add GOOGLE_SECRET
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Custom Domain**
   - In Vercel dashboard: Settings → Domains
   - Add your domain name

### Option B: Self-Hosted with Docker

**Advantages:**
- Full control
- Can self-host on any server
- Lower costs at scale
- Easy local development

**Steps:**

1. **Create Dockerfile** (add to project root)
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --legacy-peer-deps
   
   COPY . .
   RUN npm run build
   
   FROM node:20-alpine
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --legacy-peer-deps --only=production
   
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/node_modules ./node_modules
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.9'
   
   services:
     db:
       image: postgres:16
       environment:
         POSTGRES_USER: ${DB_USER}
         POSTGRES_PASSWORD: ${DB_PASSWORD}
         POSTGRES_DB: novelreader
       volumes:
         - postgres_data:/var/lib/postgresql/data
       ports:
         - "5432:5432"
   
     app:
       build: .
       environment:
         DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/novelreader
         NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
         NEXTAUTH_URL: ${NEXTAUTH_URL}
       ports:
         - "3000:3000"
       depends_on:
         - db
   
   volumes:
     postgres_data:
   ```

3. **Deploy to Server**
   ```bash
   docker-compose up -d
   ```

### Option C: AWS Deployment

**Advantages:**
- Highly scalable
- Many integrated services
- Pay-as-you-go
- Production-grade reliability

**Services needed:**
- RDS (PostgreSQL database)
- ECS/EKS (Container orchestration)
- ALB (Load balancer)
- Route 53 (DNS)
- CloudFront (CDN)

---

## Part 3: Pre-Deployment Checklist

### Security
- [ ] Change `NEXTAUTH_SECRET` to strong random value (32+ chars)
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up rate limiting for API endpoints
- [ ] Review auth configuration for production

### Performance
- [ ] Run `npm run build` and verify no errors
- [ ] Test database connection to production DB
- [ ] Verify image optimization is working
- [ ] Check bundle size with `npm run analyze`
- [ ] Set up CDN for static assets
- [ ] Enable database query caching

### Infrastructure
- [ ] Set up production PostgreSQL database
- [ ] Configure automatic backups
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure logging
- [ ] Set up health check endpoints
- [ ] Plan disaster recovery

### Operations
- [ ] Create deployment documentation
- [ ] Set up CI/CD pipeline
- [ ] Document rollback procedures
- [ ] Create admin runbook
- [ ] Set up uptime monitoring
- [ ] Plan maintenance windows

---

## Part 4: CI/CD Pipeline Setup

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/novelreader
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel --prod --token $VERCEL_TOKEN
```

---

## Part 5: Monitoring & Maintenance

### Sentry Setup (Error Tracking)

1. **Create Sentry account** at sentry.io
2. **Install Sentry**
   ```bash
   npm install @sentry/nextjs
   ```
3. **Configure `next.config.ts`**
   ```typescript
   import { withSentryConfig } from "@sentry/nextjs";
   
   export default withSentryConfig(nextConfig, {
     org: "your-org",
     project: "novel-reader",
     authToken: process.env.SENTRY_AUTH_TOKEN,
   });
   ```

### Monitoring Checklist
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Performance monitoring (New Relic)
- [ ] Database monitoring
- [ ] Log aggregation (Datadog)
- [ ] Security scanning (Snyk)

---

## Part 6: Scaling Considerations

### For 1-10K Users
- Single server sufficient
- PostgreSQL on same server or managed DB
- S3 for image storage

### For 10-100K Users
- Load balancer (nginx, HAProxy)
- Database read replicas
- Redis caching
- CDN for static assets
- Separate services for EPUB processing

### For 100K+ Users
- Kubernetes orchestration
- Multi-region deployment
- Microservices architecture
- Message queues (Bull, RabbitMQ)
- Distributed caching

---

## Deployment Costs Estimate

### Vercel
- Free tier: 10K requests/day
- Hobby: $20/month
- Pro: $20/month (includes everything)

### Self-Hosted (AWS)
- EC2: $5-50/month
- RDS PostgreSQL: $20-100/month
- Total: $25-150/month

### Self-Hosted (VPS)
- Linode/DigitalOcean: $5-40/month
- All-inclusive (app + DB)

---

## Final Deployment Command

```bash
# Build and test locally
npm run build
npm test

# Deploy to Vercel
vercel --prod

# Or deploy with Docker
docker-compose up -d
```

---

## Support & Documentation

After deployment, keep these updated:
- [ ] DEPLOYMENT.md - How to deploy
- [ ] RUNBOOK.md - How to operate
- [ ] SCALING.md - How to scale
- [ ] SECURITY.md - Security checklist
- [ ] API.md - API documentation

---

**You're ready to go live!** 🚀
