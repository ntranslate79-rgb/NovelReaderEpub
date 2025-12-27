import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Server-side guard to require an admin user.
 * Returns a NextResponse (401/403) when the check fails, or null when allowed.
 */
export async function requireAdmin() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return null;
  } catch (error) {
    console.error("requireAdmin error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
