"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Conversation } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConversations(); }, [page, search]);

  async function loadConversations() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/conversations?${params}`);
    const data = await res.json();
    setConversations(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tin nhắn ({total})</h2>
        <input
          type="text"
          placeholder="Tìm theo tên khách..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Đang tải...</div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-[hsl(var(--muted-foreground))]">Chưa có hội thoại. Hãy sync kênh trước.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium">Khách hàng</th>
                  <th className="text-left p-3 font-medium">Kênh</th>
                  <th className="text-left p-3 font-medium">Tin nhắn</th>
                  <th className="text-left p-3 font-medium">Tin cuối</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <tr key={conv.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <Link href={`/dashboard/messages/${conv.id}`} className="text-[hsl(var(--primary))] hover:underline font-medium">
                        {conv.customer_name || "Unknown"}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {(conv.channel as unknown as { name: string; channel_type: string })?.channel_type === "facebook" ? "FB" : "ZL"} · {(conv.channel as unknown as { name: string })?.name}
                      </span>
                    </td>
                    <td className="p-3">{conv.message_count}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">
                      {conv.last_message_at ? formatDate(conv.last_message_at) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              Trang {page} / {Math.ceil(total / 20)}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Trước</button>
              <button onClick={() => setPage(page + 1)} disabled={page * 20 >= total} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Sau</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
