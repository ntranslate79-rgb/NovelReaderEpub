/*
  Warnings:

  - The values [DRAFT] on the enum `NovelStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'EPUB_IMPORT', 'CHAPTER_CREATE', 'CHAPTER_UPDATE', 'CHAPTER_DELETE', 'CHAPTER_MOVE', 'ADMIN_ACCESS');

-- AlterEnum
BEGIN;
CREATE TYPE "NovelStatus_new" AS ENUM ('ONGOING', 'COMPLETED');
ALTER TABLE "public"."Novel" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Novel" ALTER COLUMN "status" TYPE "NovelStatus_new" USING ("status"::text::"NovelStatus_new");
ALTER TYPE "NovelStatus" RENAME TO "NovelStatus_old";
ALTER TYPE "NovelStatus_new" RENAME TO "NovelStatus";
DROP TYPE "public"."NovelStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Chapter" DROP CONSTRAINT "Chapter_novelId_fkey";

-- DropIndex
DROP INDEX "Novel_createdAt_idx";

-- DropIndex
DROP INDEX "Novel_status_idx";

-- AlterTable
ALTER TABLE "Novel" ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "action" "AuditActionType" NOT NULL,
    "resource" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
