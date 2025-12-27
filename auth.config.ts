import type { NextAuthConfig, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAuditAction } from "@/lib/audit";
import { isRateLimited, recordLoginAttempt, resetLoginAttempts, getRemainingAttempts } from "@/lib/rate-limit";

/**
 * NextAuth configuration for admin authentication
 * Supports:
 * - Credentials (email/password with database-backed accounts)
 * - GitHub OAuth
 * - Google OAuth
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Extract IP address from request headers
        const ipAddress = req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                         req?.headers?.get("x-real-ip") || 
                         "unknown";
        const identifier = `${credentials.email}:${ipAddress}`;

        // Check rate limiting
        if (isRateLimited(identifier)) {
          const remaining = getRemainingAttempts(identifier);
          await logAuditAction({
            action: "LOGIN_FAILED",
            details: { reason: "Rate limited", remaining },
            ipAddress,
            success: false,
            errorMsg: `Too many login attempts. Try again later (${remaining} attempts remaining)`,
          });
          throw new Error(
            `Too many login attempts. Please try again later (${remaining} attempts remaining).`
          );
        }

        // Try database lookup first
        try {
          const adminUser = await prisma.adminUser.findUnique({
            where: { email: String(credentials.email) },
          });

          if (
            adminUser &&
            adminUser.active &&
            bcrypt.compareSync(String(credentials.password), adminUser.passwordHash)
          ) {
            // Log successful login
            resetLoginAttempts(identifier);
            await logAuditAction({
              adminId: adminUser.id,
              action: "LOGIN_SUCCESS",
              ipAddress,
              userAgent: req?.headers?.get("user-agent") || undefined,
            });

            return {
              id: adminUser.id.toString(),
              email: adminUser.email,
              name: adminUser.name,
              role: adminUser.role,
            };
          }
        } catch (dbError) {
          console.error("Database lookup failed:", dbError);
        }

        // Fallback to environment variables for demo/development
        const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

        if (
          String(credentials.email) === adminEmail &&
          String(credentials.password) === adminPassword
        ) {
          resetLoginAttempts(identifier);
          return {
            id: "demo-admin",
            email: String(credentials.email),
            name: "Demo Admin",
            role: "admin",
          };
        }

        // Log failed login attempt
        recordLoginAttempt(identifier);
        const remaining = getRemainingAttempts(identifier);
        await logAuditAction({
          action: "LOGIN_FAILED",
          details: { email: String(credentials.email), remaining },
          ipAddress,
          success: false,
          errorMsg: "Invalid email or password",
        });

        throw new Error(
          `Invalid email or password (${remaining} attempts remaining).`
        );
      },
    }),
    // GitHub OAuth Provider
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    // Google OAuth Provider
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role || "user";
      }

      // Log OAuth logins
      if (account?.provider && (account.provider === "github" || account.provider === "google")) {
        await logAuditAction({
          action: "LOGIN_SUCCESS",
          details: { provider: account.provider },
        }).catch((e) => console.error("Failed to log OAuth login:", e));
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as Record<string, unknown>).role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
