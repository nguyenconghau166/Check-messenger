"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [claudeKey, setClaudeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  async function saveKey(provider: string, value: string) {
    if (!value) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `${provider}_api_key`, value, encrypted: true }),
    });
    if (res.ok) {
      setMessage(`${provider} API key đã lưu!`);
      setSettings((prev) => ({ ...prev, [`${provider}_api_key`]: "••••••••" }));
      if (provider === "claude") setClaudeKey("");
      else setGeminiKey("");
    }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Cài đặt</h2>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{message}</div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm space-y-6">
        <h3 className="font-semibold">API Keys</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Claude API Key
              {settings.claude_api_key && (
                <span className="ml-2 text-green-600 text-xs">({settings.claude_api_key === "••••••••" ? "Đã cấu hình" : ""})</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={() => saveKey("claude", claudeKey)}
                disabled={saving || !claudeKey}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Gemini API Key
              {settings.gemini_api_key && (
                <span className="ml-2 text-green-600 text-xs">({settings.gemini_api_key === "••••••••" ? "Đã cấu hình" : ""})</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={() => saveKey("gemini", geminiKey)}
                disabled={saving || !geminiKey}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold">Encryption Key</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Để mã hóa API keys và credentials, thêm biến <code className="bg-gray-100 px-1 rounded">ENCRYPTION_KEY</code> (32 bytes) vào Vercel Environment Variables.
        </p>
      </div>
    </div>
  );
}
