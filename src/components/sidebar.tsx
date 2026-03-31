"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/channels", label: "Kênh", icon: "📡" },
  { href: "/dashboard/messages", label: "Tin nhắn", icon: "💬" },
  { href: "/dashboard/jobs", label: "Phân tích", icon: "🔍" },
  { href: "/dashboard/settings", label: "Cài đặt", icon: "⚙️" },
  { href: "/dashboard/activity-logs", label: "Nhật ký", icon: "📋" },
  { href: "/dashboard/cost-logs", label: "Chi phí AI", icon: "💰" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[var(--sidebar-width)] bg-white border-r flex flex-col shrink-0">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold text-[hsl(var(--primary))]">CQA</h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Chat Quality Agent</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-[hsl(var(--primary))] text-white"
                  : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
