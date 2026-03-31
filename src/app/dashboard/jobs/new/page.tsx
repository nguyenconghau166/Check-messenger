"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "@/lib/types";

export default function NewJobPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    ai_provider: "claude",
    ai_model: "claude-haiku-4-5-20251001",
    input_channel_ids: [] as string[],
    rules_content: `## Quy tắc đánh giá CSKH

### 1. Thời gian phản hồi
- Phản hồi trong vòng 5 phút: Pass
- Phản hồi sau 5 phút: Fail

### 2. Thái độ phục vụ
- Lịch sự, thân thiện: Pass
- Thô lỗ, thiếu tôn trọng: Fail

### 3. Giải quyết vấn đề
- Giải quyết triệt để: Pass
- Không giải quyết hoặc đẩy trách nhiệm: Fail

### 4. Chính tả và ngữ pháp
- Viết đúng chính tả: Pass
- Nhiều lỗi chính tả: Fail`,
  });

  const models: Record<string, { label: string; value: string }[]> = {
    claude: [
      { label: "Claude Haiku (Nhanh, rẻ)", value: "claude-haiku-4-5-20251001" },
      { label: "Claude Sonnet (Cân bằng)", value: "claude-sonnet-4-5-20250514" },
      { label: "Claude Opus (Mạnh nhất)", value: "claude-opus-4-0-20250514" },
    ],
    gemini: [
      { label: "Gemini Flash (Miễn phí)", value: "gemini-2.0-flash" },
      { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
    ],
  };

  useEffect(() => {
    fetch("/api/channels").then((r) => r.json()).then(setChannels);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/dashboard/jobs");
    }
    setLoading(false);
  }

  function toggleChannel(id: string) {
    setForm((prev) => ({
      ...prev,
      input_channel_ids: prev.input_channel_ids.includes(id)
        ? prev.input_channel_ids.filter((c) => c !== id)
        : [...prev.input_channel_ids, id],
    }));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Tạo công việc phân tích mới</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tên công việc</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            required
            placeholder="VD: Đánh giá CSKH hàng ngày"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mô tả</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Mô tả ngắn về công việc"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">AI Provider</label>
            <select
              value={form.ai_provider}
              onChange={(e) => {
                const p = e.target.value;
                setForm({ ...form, ai_provider: p, ai_model: models[p][0].value });
              }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="gemini">Gemini (Google)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              value={form.ai_model}
              onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {models[form.ai_provider].map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kênh phân tích</label>
          <div className="space-y-2">
            {channels.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa có kênh. Hãy thêm kênh trước.</p>
            ) : (
              channels.map((ch) => (
                <label key={ch.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.input_channel_ids.includes(ch.id)}
                    onChange={() => toggleChannel(ch.id)}
                  />
                  <span className="text-sm">{ch.name} ({ch.channel_type})</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quy tắc đánh giá (Markdown)</label>
          <textarea
            value={form.rules_content}
            onChange={(e) => setForm({ ...form, rules_content: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            rows={12}
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg disabled:opacity-50">
            {loading ? "Đang tạo..." : "Tạo công việc"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg">Hủy</button>
        </div>
      </form>
    </div>
  );
}
