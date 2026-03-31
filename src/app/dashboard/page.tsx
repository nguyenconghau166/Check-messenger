"use client";

import { useEffect, useState } from "react";
import type { DashboardStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Đang tải...</div>;
  if (!stats) return <div className="text-center py-12">Không có dữ liệu</div>;

  const cards = [
    { label: "Kênh kết nối", value: stats.total_channels, color: "bg-blue-500" },
    { label: "Hội thoại", value: stats.total_conversations, color: "bg-green-500" },
    { label: "Công việc", value: stats.total_jobs, color: "bg-purple-500" },
    { label: "Lượt chạy", value: stats.total_runs, color: "bg-orange-500" },
    { label: "Tỷ lệ Pass", value: `${stats.pass_rate}%`, color: "bg-emerald-500" },
    { label: "Chi phí AI", value: formatCurrency(stats.total_cost), color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm">
            <div className={`w-8 h-8 ${card.color} rounded-lg mb-2 flex items-center justify-center text-white text-sm`}>
              {card.label[0]}
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Kết quả gần đây</h3>
        {stats.recent_results.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa có kết quả phân tích</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Khách hàng</th>
                  <th className="pb-2 font-medium">Điểm</th>
                  <th className="pb-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Vi phạm</th>
                  <th className="pb-2 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_results.map((r) => {
                  const detail = r.detail as Record<string, unknown>;
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{(r.conversation as unknown as { customer_name: string })?.customer_name || "N/A"}</td>
                      <td className="py-2 font-mono">{String(detail?.score ?? "-")}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          detail?.status === "pass"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {String(detail?.status || "-").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2">{r.rule_name || "-"}</td>
                      <td className="py-2 text-[hsl(var(--muted-foreground))]">
                        {new Date(r.created_at).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
