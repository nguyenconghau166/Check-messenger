export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="font-bold text-lg">
            Messenger Sync
          </a>
          <div className="flex gap-4">
            <a href="/" className="text-gray-600 hover:text-gray-900 text-sm">
              Trang chu
            </a>
            <a
              href="/dashboard"
              className="text-blue-600 font-medium text-sm"
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
