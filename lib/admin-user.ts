import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Options for creating/updating admin users
 */
export interface AdminUserInput {
  email: string;
  password: string;
  name?: string;
  role?: string;
}

/**
 * Create a new admin user with password hashing
 */
export async function createAdminUser(input: AdminUserInput) {
  // Validate email
  if (!input.email || !input.email.includes("@")) {
    throw new Error("Invalid email address");
  }

  // Validate password
  if (!input.password || input.password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  // Check if user already exists
  const existingUser = await prisma.adminUser.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password with bcrypt
  const passwordHash = await bcrypt.hash(input.password, 10);

  // Create user in database
  return prisma.adminUser.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role || "admin",
      active: true,
    },
  });
}

/**
 * Verify admin user credentials
 */
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return false;
    }

    return bcrypt.compareSync(password, user.passwordHash);
  } catch {
    return false;
  }
}

/**
 * Update admin user password
 */
export async function updateAdminPassword(email: string, newPassword: string) {
  // Validate password
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  return prisma.adminUser.update({
    where: { email },
    data: { passwordHash },
  });
}

/**
 * Update admin user details (name, role, active status)
 */
export async function updateAdminUser(
  email: string,
  updates: {
    name?: string;
    role?: string;
    active?: boolean;
  }
) {
  return prisma.adminUser.update({
    where: { email },
    data: updates,
  });
}

/**
 * Get admin user by email
 */
export async function getAdminUserByEmail(email: string) {
  return prisma.adminUser.findUnique({
    where: { email },
  });
}

/**
 * List all admin users
 */
export async function listAdminUsers() {
  return prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Delete admin user
 */
export async function deleteAdminUser(email: string) {
  return prisma.adminUser.delete({
    where: { email },
  });
}
