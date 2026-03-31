"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {user.email}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:underline"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
