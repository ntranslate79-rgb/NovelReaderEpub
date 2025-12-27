import AdminNavigation from "./components/Navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminNavigation>
      <div className="p-6 max-w-6xl">
        {children}
      </div>
    </AdminNavigation>
  );
}
