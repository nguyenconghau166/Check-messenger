import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat Quality Agent",
  description: "AI-powered customer service quality assessment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
