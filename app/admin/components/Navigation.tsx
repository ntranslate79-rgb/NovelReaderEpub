import Link from "next/link";
import { ReactNode } from "react";
import { auth } from "@/auth";
import { signOut } from "@/auth";
import { generateCsrfToken } from "@/lib/csrf";
import { CsrfInput } from "@/app/admin/components/FormComponents";

interface NavigationItem {
  href: string;
  label: string;
  icon: string;
}

const navigationItems: NavigationItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/novels", label: "Novels", icon: "📚" },
  { href: "/admin/epub", label: "Import EPUB", icon: "⬆️" },
];

interface AdminNavigationProps {
  children: ReactNode;
}

export default async function AdminNavigation({ children }: AdminNavigationProps) {
  const session = await auth();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Admin</h2>
          <p className="text-gray-400 text-sm mt-1">Novel Reader Platform</p>
        </div>

        <nav className="space-y-2 flex-1">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded hover:bg-gray-800 transition text-gray-100 hover:text-white"
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="space-y-3 pt-6 border-t border-gray-700">
          {/* User Info */}
          {session?.user && (
            <div className="px-4 py-3 bg-gray-800 rounded">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-sm font-medium text-white truncate">
                {session.user.email}
              </p>
            </div>
          )}

          {/* Back to Site */}
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded hover:bg-gray-800 transition text-gray-400 hover:text-gray-200"
          >
            <span>🏠</span>
            <span className="font-medium">Back to Site</span>
          </Link>

          {/* Sign Out */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <CsrfInput token={generateCsrfToken()} />
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded hover:bg-red-600 transition text-gray-400 hover:text-white text-left font-medium"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
