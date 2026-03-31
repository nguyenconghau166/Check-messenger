import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Messenger Sync - Dong bo tin nhan Fanpage",
  description:
    "Dong bo tin nhan tu Facebook Fanpage vao Supabase de phan tich chat luong CSKH",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
