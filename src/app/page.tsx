"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    const { data } = await supabase
      .from("pages")
      .select("*")
      .order("created_at", { ascending: false });
    setPages(data || []);
    setLoading(false);
  }

  async function handleSync(pageId: string) {
    setSyncing(pageId);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(
          `Hoan thanh! Da dong bo ${data.conversations_synced} cuoc hoi thoai va ${data.messages_synced} tin nhan.`
        );
      } else {
        setSyncResult(`Loi: ${data.error}`);
      }
    } catch {
      setSyncResult("Loi ket noi. Vui long thu lai.");
    }
    setSyncing(null);
    loadPages();
  }

  // Check URL params for status messages
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      setStatusMessage(
        `Ket noi thanh cong! Da lien ket ${params.get("pages")} fanpage.`
      );
      window.history.replaceState({}, "", "/");
    } else if (params.get("error")) {
      setStatusMessage(`Loi: ${params.get("error")}`);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Messenger Sync</h1>
        <p className="text-gray-600">
          Dong bo tin nhan tu Facebook Fanpage vao Supabase de phan tich AI
        </p>
      </div>

      {statusMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          {statusMessage}
        </div>
      )}

      {/* Connect Button */}
      <div className="mb-8 text-center">
        <a
          href="/api/auth/facebook"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Ket noi Facebook Page
        </a>
      </div>

      {/* Connected Pages */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Cac Page da ket noi</h2>

        {loading ? (
          <p className="text-gray-500">Dang tai...</p>
        ) : pages.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            Chua co page nao duoc ket noi. Hay click &quot;Ket noi Facebook
            Page&quot; de bat dau.
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div
                key={page.id}
                className="bg-white rounded-lg border p-6 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-lg">
                    {page.page_name || page.facebook_page_id}
                  </h3>
                  <p className="text-sm text-gray-500">
                    ID: {page.facebook_page_id}
                  </p>
                  {page.last_synced_at && (
                    <p className="text-sm text-gray-500">
                      Dong bo lan cuoi:{" "}
                      {new Date(page.last_synced_at).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSync(page.id)}
                    disabled={syncing === page.id}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {syncing === page.id ? "Dang dong bo..." : "Dong bo tin nhan"}
                  </button>
                  <a
                    href="/dashboard"
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Xem Dashboard
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {syncResult && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {syncResult}
        </div>
      )}

      {/* Stats section */}
      <div className="mt-12 bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Huong dan su dung</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Click &quot;Ket noi Facebook Page&quot; va dang nhap Facebook</li>
          <li>Chon cac Fanpage ban muon dong bo</li>
          <li>Click &quot;Dong bo tin nhan&quot; de tai toan bo lich su tin nhan</li>
          <li>Tin nhan moi se tu dong cap nhat qua webhook</li>
          <li>Su dung Claude Desktop + Supabase MCP de phan tich du lieu</li>
        </ol>
      </div>
    </div>
  );
}
