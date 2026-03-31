"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Conversation } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [conversations, setConversations] = useState<
    (Conversation & { page_name?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*, pages(page_name)")
      .order("last_message_at", { ascending: false });

    const formatted =
      data?.map((c) => ({
        ...c,
        page_name: (c.pages as { page_name: string } | null)?.page_name,
      })) || [];

    setConversations(formatted);
    setLoading(false);
  }

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phut truoc`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} gio truoc`;
    const days = Math.floor(hours / 24);
    return `${days} ngay truoc`;
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-12">Dang tai...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cuoc hoi thoai</h1>
        <span className="text-sm text-gray-500">
          {conversations.length} cuoc hoi thoai
        </span>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
          Chua co cuoc hoi thoai nao. Hay ket noi Fanpage va dong bo tin nhan
          truoc.
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {conversations.map((conv) => (
            <a
              key={conv.id}
              href={`/dashboard/${conv.id}`}
              className="block p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {conv.participant_name || "Khach hang"}
                    </h3>
                    {conv.page_name && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {conv.page_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {conv.snippet || "Khong co noi dung"}
                  </p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-gray-400">
                    {timeAgo(conv.last_message_at)}
                  </p>
                  {conv.message_count && conv.message_count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {conv.message_count} tin nhan
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
