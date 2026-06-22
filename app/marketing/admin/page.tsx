"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Simple client-side gate — the page is unlisted; password adds a layer for shared devices.
// Change ADMIN_PASSWORD here or set NEXT_PUBLIC_MOS_ADMIN_KEY in .env.local
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_MOS_ADMIN_KEY ?? "mos-admin-2025";

type Status = "pending" | "queued" | "running" | "done" | "failed" | "rejected";

type Job = {
  id: string;
  product_name: string;
  platform: string;
  video_type: string;
  status: Status;
  created_at: string;
  completed_at: string | null;
  queued_at: string | null;
  rejection_reason: string | null;
  video_url_en: string | null;
  video_url_zh: string | null;
  muapi_task_id_en: string | null; // stores provider label after render
  product_image_url: string | null;
};

const STATUS_TABS: { label: string; value: Status | "all" }[] = [
  { label: "All", value: "all" },
  { label: "⏳ Pending", value: "pending" },
  { label: "🟡 Queued", value: "queued" },
  { label: "🔵 Running", value: "running" },
  { label: "✅ Done", value: "done" },
  { label: "❌ Failed", value: "failed" },
  { label: "🚫 Rejected", value: "rejected" },
];

const STATUS_COLORS: Record<Status, string> = {
  pending:  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  queued:   "bg-amber-500/20 text-amber-300 border-amber-500/30",
  running:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  done:     "bg-green-500/20 text-green-300 border-green-500/30",
  failed:   "bg-red-500/20 text-red-300 border-red-500/30",
  rejected: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const PLATFORM_LABELS: Record<string, string> = {
  TT: "TikTok", IG: "Instagram", YT: "YouTube Shorts", LI: "LinkedIn",
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  text_overlay: "✏️ Text Overlay",
  ai_unboxing:  "📦 AI Unboxing",
  ai_demo:      "🎬 AI Demo",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-SG", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Password gate ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem("mos_admin_auth", "1");
      onAuth();
    } else {
      setError(true);
      setPw("");
    }
  }

  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-white">MarketingOS Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Jobs dashboard</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false); }}
            placeholder="Admin password"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          {error && (
            <p className="text-rose-400 text-xs text-center">Incorrect password</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main admin view ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const supabase = createClient();

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) setJobs(data as Job[]);
    setLastRefresh(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  // Count per status for badges
  const counts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#080C18] px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <a href="/marketing" className="text-slate-500 hover:text-slate-300 text-sm">← Home</a>
              <span className="text-slate-700">|</span>
              <h1 className="text-white font-bold text-lg">MarketingOS Jobs</h1>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              {jobs.length} jobs total · refreshed {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={loadJobs}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "⏳" : "🔄 Refresh"}
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_TABS.map(tab => {
            const count = tab.value === "all" ? jobs.length : (counts[tab.value] ?? 0);
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-rose-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${active ? "bg-rose-600" : "bg-slate-700"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading jobs…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No {filter !== "all" ? filter : ""} jobs found
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyId() {
    navigator.clipboard.writeText(job.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Product thumbnail */}
        {job.product_image_url ? (
          <img
            src={job.product_image_url}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-600"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-700 shrink-0 flex items-center justify-center text-slate-500 text-lg">
            📦
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm truncate">{job.product_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[job.status]}`}>
              {job.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-slate-500 text-xs">{PLATFORM_LABELS[job.platform] ?? job.platform}</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-slate-500 text-xs">{VIDEO_TYPE_LABELS[job.video_type] ?? job.video_type}</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-slate-500 text-xs">{formatDate(job.created_at)}</span>
          </div>
        </div>

        {/* Chevron */}
        <span className="text-slate-600 text-xs mt-1">{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-3">

          {/* Job ID */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium w-20 shrink-0">Job ID</span>
            <span className="text-xs font-mono text-slate-300 flex-1 truncate">{job.id}</span>
            <button
              onClick={e => { e.stopPropagation(); copyId(); }}
              className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 transition-colors"
            >
              {copied ? "✅" : "Copy"}
            </button>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-600">Queued: </span>
              <span className="text-slate-400">{formatDate(job.queued_at)}</span>
            </div>
            <div>
              <span className="text-slate-600">Completed: </span>
              <span className="text-slate-400">{formatDate(job.completed_at)}</span>
            </div>
          </div>

          {/* Provider used */}
          {job.muapi_task_id_en && (
            <div className="text-xs">
              <span className="text-slate-600">Provider: </span>
              <span className="text-slate-400">{job.muapi_task_id_en}</span>
            </div>
          )}

          {/* Rejection reason */}
          {job.rejection_reason && (
            <div className="text-xs">
              <span className="text-slate-600">Rejection: </span>
              <span className="text-red-400">{job.rejection_reason}</span>
            </div>
          )}

          {/* Video links */}
          {(job.video_url_en || job.video_url_zh) && (
            <div className="flex gap-2 flex-wrap">
              {job.video_url_en && (
                <a
                  href={job.video_url_en}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                >
                  ⬇ Download EN
                </a>
              )}
              {job.video_url_zh && (
                <a
                  href={job.video_url_zh}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                >
                  ⬇ Download 中文
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <a
              href={`/marketing/status/${job.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              🔍 Status Page
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root — handles auth gate ─────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = sessionStorage.getItem("mos_admin_auth") === "1";
    setAuthed(ok);
  }, []);

  if (authed === null) return null; // hydration guard

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  return <AdminDashboard />;
}
