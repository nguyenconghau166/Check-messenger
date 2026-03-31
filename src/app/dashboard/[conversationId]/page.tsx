"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Conversation, Message } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [conversationId]);

  async function loadData() {
    const [convRes, msgRes] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single(),
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("facebook_created_at", { ascending: true }),
    ]);

    setConversation(convRes.data);
    setMessages(msgRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-12">Dang tai...</p>;
  }

  if (!conversation) {
    return (
      <p className="text-red-500 text-center py-12">
        Khong tim thay cuoc hoi thoai
      </p>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <a
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Quay lai danh sach
        </a>
        <h1 className="text-2xl font-bold">
          {conversation.participant_name || "Khach hang"}
        </h1>
        <p className="text-sm text-gray-500">
          {messages.length} tin nhan
          {conversation.participant_facebook_id &&
            ` · ID: ${conversation.participant_facebook_id}`}
        </p>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Khong co tin nhan nao
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_page_reply ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  msg.is_page_reply
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-70">
                  {msg.sender_name || (msg.is_page_reply ? "Page" : "Khach")}
                </p>
                {msg.message_text && <p className="text-sm">{msg.message_text}</p>}
                {msg.attachments && (
                  <p className="text-xs mt-1 opacity-70">[Dinh kem]</p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    msg.is_page_reply ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {new Date(msg.facebook_created_at).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
