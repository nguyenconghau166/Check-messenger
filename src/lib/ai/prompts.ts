export function buildAnalysisPrompt(transcript: string, rules: string): string {
  return `Bạn là chuyên gia đánh giá chất lượng dịch vụ khách hàng (CSKH).

## Quy tắc đánh giá
${rules}

## Hội thoại cần đánh giá
${transcript}

## Yêu cầu
Hãy đánh giá hội thoại trên theo các quy tắc đã cho. Trả về kết quả dạng JSON:

\`\`\`json
{
  "score": <điểm 0-100>,
  "status": "<pass hoặc fail>",
  "violations": [
    {
      "rule_name": "<tên quy tắc vi phạm>",
      "severity": "<low|medium|high|critical>",
      "evidence": "<trích dẫn đoạn chat vi phạm>",
      "detail": "<giải thích chi tiết>"
    }
  ],
  "summary": "<tóm tắt đánh giá ngắn gọn>"
}
\`\`\`

Chỉ trả về JSON, không thêm text khác.`;
}

export function buildBatchAnalysisPrompt(
  transcripts: { index: number; customerName: string; transcript: string }[],
  rules: string
): string {
  const conversationBlocks = transcripts
    .map((t) => `### Hội thoại ${t.index}: ${t.customerName}\n${t.transcript}`)
    .join("\n\n---\n\n");

  return `Bạn là chuyên gia đánh giá chất lượng dịch vụ khách hàng (CSKH).

## Quy tắc đánh giá
${rules}

## Các hội thoại cần đánh giá
${conversationBlocks}

## Yêu cầu
Hãy đánh giá TẤT CẢ ${transcripts.length} hội thoại trên theo các quy tắc đã cho.
Trả về kết quả dạng JSON array, mỗi phần tử tương ứng một hội thoại:

\`\`\`json
[
  {
    "conversation_index": 1,
    "score": <điểm 0-100>,
    "status": "<pass hoặc fail>",
    "violations": [
      {
        "rule_name": "<tên quy tắc vi phạm>",
        "severity": "<low|medium|high|critical>",
        "evidence": "<trích dẫn đoạn chat vi phạm>",
        "detail": "<giải thích chi tiết>"
      }
    ],
    "summary": "<tóm tắt đánh giá ngắn gọn>"
  }
]
\`\`\`

Trả về đúng ${transcripts.length} kết quả theo đúng thứ tự conversation_index. Chỉ trả về JSON array, không thêm text khác.`;
}

export function formatTranscript(
  messages: { sender_type: string; sender_name: string; content: string; sent_at: string }[]
): string {
  return messages
    .map((m) => {
      const role = m.sender_type === "customer" ? "Khách hàng" : m.sender_type === "agent" ? "CSKH" : "Hệ thống";
      const name = m.sender_name ? ` (${m.sender_name})` : "";
      const time = new Date(m.sent_at).toLocaleString("vi-VN");
      return `[${time}] ${role}${name}: ${m.content}`;
    })
    .join("\n");
}
