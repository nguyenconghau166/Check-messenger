"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Channel } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", channel_type: "facebook", page_id: "", access_token: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [syncDateDialog, setSyncDateDialog] = useState(false);
  const [syncDateValue, setSyncDateValue] = useState("");
  const [syncDateChannelId, setSyncDateChannelId] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChannels(); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  async function handleSync(id: string, opts?: { mode?: string; since?: string }) {
    setOpenMenu(null);
    setSyncing(id);
    const params = new URLSearchParams();
    if (opts?.mode) params.set("mode", opts.mode);
    if (opts?.since) params.set("since", opts.since);
    const qs = params.toString() ? `?${params.toString()}` : "";
    await fetch(`/api/channels/${id}/sync${qs}`, { method: "POST" });
    setSyncing(null);
    loadChannels();
  }

  function handleSyncFull(id: string) {
    if (!confirm("Đồng bộ toàn bộ lịch sử tin nhắn? Quá trình này có thể mất vài phút.")) return;
    handleSync(id, { mode: "full" });
  }

  function openSyncDatePicker(id: string) {
    setOpenMenu(null);
    setSyncDateChannelId(id);
    setSyncDateValue("");
    setSyncDateDialog(true);
  }

  function confirmSyncFromDate() {
    setSyncDateDialog(false);
    if (syncDateValue && syncDateChannelId) {
      handleSync(syncDateChannelId, { since: syncDateValue });
    }
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

                {/* Split button: Sync + dropdown arrow */}
                <div className="relative inline-flex" ref={openMenu === ch.id ? menuRef : undefined}>
                  <button
                    onClick={() => handleSync(ch.id)}
                    disabled={syncing === ch.id}
                    className="px-3 py-1 text-sm border border-r-0 rounded-l-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {syncing === ch.id ? "Syncing..." : "Sync"}
                  </button>
                  <button
                    onClick={() => setOpenMenu(openMenu === ch.id ? null : ch.id)}
                    className="px-1.5 py-1 text-sm border rounded-r-lg hover:bg-gray-50"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openMenu === ch.id && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border z-50">
                      <button
                        onClick={() => openSyncDatePicker(ch.id)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Sync từ ngày...
                      </button>
                      <button
                        onClick={() => handleSyncFull(ch.id)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Sync toàn bộ lịch sử
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={() => handleDelete(ch.id)} className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sync from date modal */}
      {syncDateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold">Sync từ ngày</h3>
            <input
              type="date"
              value={syncDateValue}
              onChange={(e) => setSyncDateValue(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSyncDateDialog(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
              <button
                onClick={confirmSyncFromDate}
                disabled={!syncDateValue}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm disabled:opacity-50"
              >
                Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
