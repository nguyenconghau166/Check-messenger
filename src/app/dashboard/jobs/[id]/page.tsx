"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Job, JobRun, JobResult } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<(Job & { runs: JobRun[] }) | null>(null);
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { loadJob(); }, [id]);

  async function loadJob() {
    const [jobRes, resultsRes] = await Promise.all([
      fetch(`/api/jobs/${id}`).then((r) => r.json()),
      fetch(`/api/jobs/${id}/results`).then((r) => r.json()),
    ]);
    setJob(jobRes);
    setResults(resultsRes.data || []);
    setLoading(false);
  }

  async function handleTrigger() {
    setRunning(true);
    await fetch(`/api/jobs/${id}/trigger`, { method: "POST" });
    setRunning(false);
    loadJob();
  }

  if (loading) return <div className="text-center py-12">Đang tải...</div>;
  if (!job) return <div className="text-center py-12">Không tìm thấy</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{job.name}</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {job.ai_provider}/{job.ai_model} · {job.description || ""}
          </p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={running}
          className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
        >
          {running ? "Đang chạy..." : "Chạy phân tích"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Lịch sử chạy</h3>
          {job.runs.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa có lượt chạy nào</p>
          ) : (
            <div className="space-y-2">
              {job.runs.map((run) => {
                const summary = run.summary as Record<string, number>;
                return (
                  <div key={run.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        run.status === "success" ? "bg-green-100 text-green-700"
                        : run.status === "error" ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {run.status}
                      </span>
                      <span className="text-xs ml-2">
                        {summary?.total || 0} hội thoại · {summary?.passed || 0} pass · {summary?.failed || 0} fail
                      </span>
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {formatDate(run.started_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Quy tắc đánh giá</h3>
          <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
            {job.rules_content || "Không có quy tắc"}
          </pre>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3">Kết quả phân tích</h3>
        {results.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa có kết quả</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Khách hàng</th>
                <th className="pb-2 font-medium">Điểm</th>
                <th className="pb-2 font-medium">Trạng thái</th>
                <th className="pb-2 font-medium">Tóm tắt</th>
                <th className="pb-2 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const detail = r.detail as Record<string, unknown>;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{(r.conversation as unknown as { customer_name: string })?.customer_name || "N/A"}</td>
                    <td className="py-2 font-mono">{String(detail?.score ?? "-")}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        detail?.status === "pass" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {String(detail?.status || "-").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 max-w-xs truncate">{String(detail?.summary || "-")}</td>
                    <td className="py-2 text-[hsl(var(--muted-foreground))]">{formatDate(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
