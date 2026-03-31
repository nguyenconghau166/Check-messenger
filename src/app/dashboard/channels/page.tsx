"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Channel } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", channel_type: "facebook", page_id: "", access_token: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadChannels(); }, []);

  async function loadChannels() {
    const res = await fetch("/api/channels");
    setChannels(await res.json());
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const credentials = form.channel_type === "facebook"
      ? { page_id: form.page_id, page_access_token: form.access_token }
      : { oa_id: form.page_id, access_token: form.access_token, refresh_token: "", app_id: "", app_secret: "" };

    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, channel_type: form.channel_type, credentials }),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", channel_type: "facebook", page_id: "", access_token: "" });
    loadChannels();
  }

  async function handleSync(id: string) {
    await fetch(`/api/channels/${id}/sync`, { method: "POST" });
    loadChannels();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa kênh này?")) return;
    await fetch(`/api/channels/${id}`, { method: "DELETE" });
    loadChannels();
  }

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Kênh kết nối</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm">
          + Thêm kênh
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Thêm kênh mới</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên kênh</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại</label>
              <select value={form.channel_type} onChange={(e) => setForm({ ...form, channel_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="facebook">Facebook Messenger</option>
                <option value="zalo_oa">Zalo OA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{form.channel_type === "facebook" ? "Page ID" : "OA ID"}</label>
              <input value={form.page_id} onChange={(e) => setForm({ ...form, page_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required type="password" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
          </div>
        </form>
      )}

      {channels.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-[hsl(var(--muted-foreground))]">Chưa có kênh nào. Thêm kênh để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {channels.map((ch) => (
            <div key={ch.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${ch.channel_type === "facebook" ? "bg-blue-600" : "bg-blue-400"}`}>
                  {ch.channel_type === "facebook" ? "FB" : "ZL"}
                </div>
                <div>
                  <Link href={`/dashboard/channels/${ch.id}`} className="font-medium hover:underline">{ch.name}</Link>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {ch.channel_type === "facebook" ? "Facebook" : "Zalo OA"} · ID: {ch.external_id}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs text-[hsl(var(--muted-foreground))]">
                  {ch.last_sync_at ? `Sync: ${formatDate(ch.last_sync_at)}` : "Chưa sync"}
                  {ch.last_sync_status && (
                    <span className={`ml-2 ${ch.last_sync_status === "success" ? "text-green-600" : "text-red-600"}`}>
                      ({ch.last_sync_status})
                    </span>
                  )}
                </div>
                <button onClick={() => handleSync(ch.id)} className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50">Sync</button>
                <button onClick={() => handleDelete(ch.id)} className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
