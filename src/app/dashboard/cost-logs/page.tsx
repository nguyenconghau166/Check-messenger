"use client";

import { useEffect, useState } from "react";
import type { AiUsageLog } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function CostLogsPage() {
  const [logs, setLogs] = useState<AiUsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cost-logs")
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const totalCost = logs.reduce((sum, l) => sum + Number(l.cost_usd), 0);
  const totalInput = logs.reduce((sum, l) => sum + l.input_tokens, 0);
  const totalOutput = logs.reduce((sum, l) => sum + l.output_tokens, 0);

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Chi phí AI</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Tổng chi phí</div>
          <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Input tokens</div>
          <div className="text-2xl font-bold">{totalInput.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Output tokens</div>
          <div className="text-2xl font-bold">{totalOutput.toLocaleString()}</div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-[hsl(var(--muted-foreground))]">Chưa có dữ liệu chi phí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-left p-3 font-medium">Model</th>
                <th className="text-right p-3 font-medium">Input</th>
                <th className="text-right p-3 font-medium">Output</th>
                <th className="text-right p-3 font-medium">Chi phí</th>
                <th className="text-left p-3 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3">{log.provider}</td>
                  <td className="p-3 font-mono text-xs">{log.model}</td>
                  <td className="p-3 text-right">{log.input_tokens.toLocaleString()}</td>
                  <td className="p-3 text-right">{log.output_tokens.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(Number(log.cost_usd))}</td>
                  <td className="p-3 text-[hsl(var(--muted-foreground))]">
                    {new Date(log.created_at).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
