import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

      <Link
        href="/admin/novels"
        className="underline text-sm"
      >
        Manage novels →
      </Link>
    </div>
  );
}
