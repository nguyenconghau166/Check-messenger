"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    const res = await fetch("/api/jobs");
    setJobs(await res.json());
    setLoading(false);
  }

  async function handleTrigger(id: string) {
    if (!confirm("Chạy phân tích ngay?")) return;
    await fetch(`/api/jobs/${id}/trigger`, { method: "POST" });
    loadJobs();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa công việc này?")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    loadJobs();
  }

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Phân tích QC</h2>
        <Link href="/dashboard/jobs/new" className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm">
          + Tạo mới
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-[hsl(var(--muted-foreground))]">Chưa có công việc phân tích nào.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/dashboard/jobs/${job.id}`} className="font-medium text-[hsl(var(--primary))] hover:underline">
                    {job.name}
                  </Link>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {job.ai_provider}/{job.ai_model} · {job.description || "Không có mô tả"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {job.last_run_status && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      job.last_run_status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {job.last_run_status}
                    </span>
                  )}
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {job.last_run_at ? formatDate(job.last_run_at) : "Chưa chạy"}
                  </span>
                  <button onClick={() => handleTrigger(job.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600">
                    Chạy
                  </button>
                  <button onClick={() => handleDelete(job.id)} className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
