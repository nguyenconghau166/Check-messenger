"use client";

import { useEffect, useState } from "react";
import type { ActivityLog } from "@/lib/types";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity-logs")
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Nhật ký hoạt động</h2>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-[hsl(var(--muted-foreground))]">Chưa có hoạt động nào.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium">Hành động</th>
                <th className="text-left p-3 font-medium">Loại</th>
                <th className="text-left p-3 font-medium">Chi tiết</th>
                <th className="text-left p-3 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{log.action}</td>
                  <td className="p-3">{log.resource_type || "-"}</td>
                  <td className="p-3 max-w-xs truncate text-xs">
                    {JSON.stringify(log.detail)}
                  </td>
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
