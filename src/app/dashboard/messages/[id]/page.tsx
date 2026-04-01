"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Message, JobResult } from "@/lib/types";

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [evaluations, setEvaluations] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/conversations/${id}/messages`).then((r) => r.json()),
      fetch(`/api/conversations/${id}/evaluations`).then((r) => r.json()),
    ]).then(([msgs, evals]) => {
      setMessages(msgs);
      setEvaluations(evals);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <h2 className="text-xl font-bold">Hội thoại</h2>
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3 max-h-[70vh] overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "agent" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.sender_type === "agent"
                    ? "bg-[hsl(var(--primary))] text-white"
                    : "bg-gray-100"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {msg.sender_name || msg.sender_type} · {new Date(msg.sent_at).toLocaleTimeString("vi-VN")}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {msg.content.split(/(\[Hình ảnh\]|\[Video\]|\[Âm thanh\]|\[File: [^\]]+\]|\[Sticker\]|\[GIF\]|\[Đính kèm\]|\[Vị trí\]|\[Liên kết\])/).map((part, idx) =>
                    /^\[(Hình ảnh|Video|Âm thanh|File:|Sticker|GIF|Đính kèm|Vị trí|Liên kết)/.test(part) ? (
                      <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        msg.sender_type === "agent" ? "bg-white/20" : "bg-gray-200"
                      }`}>
                        {part.includes("Hình ảnh") ? "🖼️" : part.includes("Video") ? "🎥" : part.includes("Sticker") ? "😀" : part.includes("File") ? "📎" : "📄"}
                        {part.slice(1, -1)}
                      </span>
                    ) : (
                      <span key={idx}>{part}</span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-[hsl(var(--muted-foreground))]">Không có tin nhắn</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Đánh giá AI</h3>
        {evaluations.length === 0 ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa được đánh giá</p>
          </div>
        ) : (
          evaluations.map((ev) => {
            const detail = ev.detail as Record<string, unknown>;
            const violations = (detail?.violations as Record<string, string>[]) || [];
            return (
              <div key={ev.id} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{String(detail?.score ?? "-")}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    detail?.status === "pass" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {String(detail?.status || "-").toUpperCase()}
                  </span>
                </div>
                <p className="text-sm">{String(detail?.summary || "")}</p>
                {violations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Vi phạm:</h4>
                    {violations.map((v, i) => (
                      <div key={i} className="text-xs bg-red-50 p-2 rounded">
                        <span className="font-medium">{v.rule_name}</span> ({v.severity})
                        <p className="mt-1">{v.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(ev.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
