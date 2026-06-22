"use client";

/**
 * /marketing/status — My Requests hub
 *
 * Shows all jobs saved in this browser's localStorage, with live status
 * badges fetched from Supabase. Also provides a manual Job ID lookup for
 * jobs submitted on other devices.
 *
 * Jobs are saved to localStorage automatically when the submit SuccessScreen mounts.
 * No login required.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type JobStatus = "pending" | "queued" | "running" | "done" | "failed" | "rejected";

type SavedJob = {
  id: string;
  product_name: string;
  platform: string;
  created_at: string;
};

type LiveJob = SavedJob & {
  status: JobStatus;
  video_url: string | null;
  video_url_zh: string | null;
  completed_at: string | null;
};

const STATUS_CONFIG: Record<JobStatus, { icon: string; label: string; color: string; pulse?: boolean }> = {
  pending:  { icon: "⏳", label: "Pending review",    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"  },
  queued:   { icon: "🟡", label: "Approved — queued", color: "text-amber-400  bg-amber-500/10  border-amber-500/30"   },
  running:  { icon: "🔵", label: "Rendering…",        color: "text-blue-400   bg-blue-500/10   border-blue-500/30",   pulse: true },
  done:     { icon: "✅", label: "Ready to download", color: "text-green-400  bg-green-500/10  border-green-500/30"  },
  failed:   { icon: "❌", label: "Failed — resubmit", color: "text-red-400    bg-red-500/10    border-red-500/30"    },
  rejected: { icon: "🚫", label: "Not approved",      color: "text-slate-400  bg-slate-500/10  border-slate-500/30"  },
};

const PLATFORM_LABELS: Record<string, string> = {
  TT: "TikTok", IG: "Instagram Reels", YT: "YouTube Shorts", LI: "LinkedIn",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Single job card ──────────────────────────────────────────────────────────

function JobCard({ job, onRemove }: { job: LiveJob; onRemove: (id: string) => void }) {
  const cfg    = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
  const isDone = job.status === "done";

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: name + meta */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{job.product_name}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {PLATFORM_LABELS[job.platform] ?? job.platform} · {timeAgo(job.created_at)}
            </p>
          </div>
          {/* Right: status badge */}
          <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap
            ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Download buttons when done */}
        {isDone && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {job.video_url && (
              <a
                href={job.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  bg-green-500/20 text-green-300 border border-green-500/30
                  text-xs font-medium hover:bg-green-500/30 transition-colors"
              >
                ⬇ Download EN
              </a>
            )}
            {job.video_url_zh && (
              <a
                href={job.video_url_zh}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  bg-blue-500/20 text-blue-300 border border-blue-500/30
                  text-xs font-medium hover:bg-blue-500/30 transition-colors"
              >
                ⬇ 下载中文
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700/40 px-4 py-2.5 flex items-center justify-between">
        <a
          href={`/marketing/status/${job.id}`}
          className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
        >
          Full details →
        </a>
        <button
          onClick={() => onRemove(job.id)}
          className="text-xs text-slate-700 hover:text-slate-500 transition-colors"
          title="Remove from this list"
        >
          ✕ Remove
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MyRequestsPage() {
  const [saved,       setSaved]       = useState<SavedJob[]>([]);
  const [liveJobs,    setLiveJobs]    = useState<LiveJob[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [lookupId,    setLookupId]    = useState("");

  const supabase = createClient();

  // Load saved stubs from localStorage
  useEffect(() => {
    try {
      const raw     = localStorage.getItem("mos_jobs");
      const parsed  = raw ? (JSON.parse(raw) as SavedJob[]) : [];
      setSaved(parsed);
    } catch {
      setSaved([]);
    }
  }, []);

  // Fetch live statuses from Supabase
  const fetchLive = useCallback(async () => {
    if (saved.length === 0) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("marketing_jobs")
      .select("id, product_name, platform, status, video_url, video_url_zh, created_at, completed_at")
      .in("id", saved.map(j => j.id))
      .order("created_at", { ascending: false });

    if (!error && data) {
      const map = new Map((data as LiveJob[]).map(j => [j.id, j]));
      setLiveJobs(
        saved.map(s => map.get(s.id) ?? {
          ...s, status: "pending" as JobStatus,
          video_url: null, video_url_zh: null, completed_at: null,
        })
      );
    } else {
      setLiveJobs(
        saved.map(s => ({ ...s, status: "pending" as JobStatus, video_url: null, video_url_zh: null, completed_at: null }))
      );
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, [saved, supabase]);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  // Auto-refresh every 30s while any job is still active
  useEffect(() => {
    const hasActive = liveJobs.some(j => ["pending", "queued", "running"].includes(j.status));
    if (!hasActive) return;
    const t = setInterval(fetchLive, 30000);
    return () => clearInterval(t);
  }, [liveJobs, fetchLive]);

  function removeJob(id: string) {
    const updated = saved.filter(j => j.id !== id);
    setSaved(updated);
    setLiveJobs(prev => prev.filter(j => j.id !== id));
    try { localStorage.setItem("mos_jobs", JSON.stringify(updated)); } catch { /* ok */ }
  }

  function lookupById(e: React.FormEvent) {
    e.preventDefault();
    const id = lookupId.trim();
    if (id) window.location.href = `/marketing/status/${id}`;
  }

  const activeCount = liveJobs.filter(j => ["pending", "queued", "running"].includes(j.status)).length;
  const doneCount   = liveJobs.filter(j => j.status === "done").length;

  return (
    <main className="min-h-screen bg-[#080C18] text-white px-4 py-8">
      <div className="max-w-xl mx-auto">

        {/* Nav */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <Link href="/marketing" className="text-slate-500 hover:text-slate-300 transition-colors">← MarketingOS</Link>
          <span className="text-slate-700">/</span>
          <span className="text-white font-medium">My Requests</span>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black">My Video Requests</h1>
          {!loading && liveJobs.length > 0 && (
            <button
              onClick={fetchLive}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <p className="text-slate-500 text-sm mb-1">
          Jobs submitted from this browser — saved automatically.
        </p>
        {lastRefresh && (
          <p className="text-slate-700 text-xs mb-6">
            Updated {lastRefresh.toLocaleTimeString()}
          </p>
        )}

        {/* Summary pills */}
        {liveJobs.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {liveJobs.length} total
            </span>
            {activeCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
                🔵 {activeCount} in progress
              </span>
            )}
            {doneCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                ✅ {doneCount} ready to download
              </span>
            )}
          </div>
        )}

        {/* Job list */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading your requests…
          </div>
        ) : liveJobs.length > 0 ? (
          <div className="space-y-3 mb-8">
            {liveJobs.map(job => (
              <JobCard key={job.id} job={job} onRemove={removeJob} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-10 text-center mb-8">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-white font-semibold mb-1">No requests on this device yet</p>
            <p className="text-slate-500 text-sm mb-5">
              Jobs you submit will appear here automatically when you use this browser.
            </p>
            <a
              href="/marketing/submit"
              className="inline-block px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors"
            >
              Create your first video →
            </a>
          </div>
        )}

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#080C18] px-3 text-xs text-slate-600">or look up by Job ID</span>
          </div>
        </div>

        {/* Manual lookup */}
        <div className="mb-8">
          <p className="text-xs text-slate-500 mb-3">
            Submitted on a different device or browser? Paste the Job ID from your confirmation screen.
          </p>
          <form onSubmit={lookupById} className="flex gap-2">
            <input
              type="text"
              value={lookupId}
              onChange={e => setLookupId(e.target.value)}
              placeholder="e.g. 3f2988a4-8085-41c4-…"
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm
                placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
            />
            <button
              type="submit"
              disabled={!lookupId.trim()}
              className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              Look up
            </button>
          </form>
        </div>

        {/* Submit new */}
        <div className="text-center">
          <a
            href="/marketing/submit"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            + Submit a new product
          </a>
        </div>

      </div>
    </main>
  );
}
