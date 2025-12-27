import { prisma } from "@/lib/prisma";

interface AuditLogInput {
  adminId?: number;
  action: "LOGIN_ATTEMPT" | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "EPUB_IMPORT" | "CHAPTER_CREATE" | "CHAPTER_UPDATE" | "CHAPTER_DELETE" | "CHAPTER_MOVE" | "ADMIN_ACCESS";
  resource?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMsg?: string;
}

/**
 * Logs an admin action to the audit trail
 * Useful for tracking who did what and when
 */
export async function logAuditAction(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        resource: input.resource,
        details: input.details ? JSON.stringify(input.details) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        success: input.success ?? true,
        errorMsg: input.errorMsg,
      },
    });
  } catch (error) {
    // Don't fail the operation if audit logging fails
    console.error("Failed to log audit action:", error);
  }
}

/**
 * Gets audit logs with optional filtering
 */
export async function getAuditLogs(
  filter?: {
    adminId?: number;
    action?: "LOGIN_ATTEMPT" | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "EPUB_IMPORT" | "CHAPTER_CREATE" | "CHAPTER_UPDATE" | "CHAPTER_DELETE" | "CHAPTER_MOVE" | "ADMIN_ACCESS";
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  const limit = filter?.limit ?? 100;

  return prisma.auditLog.findMany({
    where: {
      adminId: filter?.adminId,
      action: filter?.action,
      createdAt: {
        gte: filter?.startDate,
        lte: filter?.endDate,
      },
    },
    include: {
      admin: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}
