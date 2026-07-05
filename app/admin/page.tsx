"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, EyeOff, Trash2, LogOut, Search, X, Check, Ban, Clock } from "lucide-react";

type Status = "pending" | "approved" | "hidden";
type Kind = "sounds" | "gifs";

interface Sound {
  id: string;
  name: string;
  category: string;
  dur?: string;
  status?: Status;
  downloads?: number;
  likes?: number;
  createdAt?: string;
  firebaseUrl?: string;
}

const CAT_COLORS: Record<string, string> = {
  Trending: "#ff4500", Memes: "#8b5cf6", Bollywood: "#f59e0b",
  Anime: "#ec4899", Gaming: "#10b981", Viral: "#06b6d4",
  FX: "#f97316", Reactions: "#a78bfa", Alerts: "#ef4444",
  Game: "#22c55e", Music: "#e879f9",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pending",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  approved: { label: "Approved", color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  hidden:   { label: "Hidden",   color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  legacy:   { label: "Live",     color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
};

function statusOf(s: Sound): string {
  return s.status ?? "legacy";
}

function fmt(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AdminPage() {
  const [authed, setAuthed]   = useState<boolean | null>(null); // null = checking
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [kind, setKind]       = useState<Kind>("sounds");
  const [sounds, setSounds]   = useState<Sound[]>([]);
  const [query, setQuery]     = useState("");
  const [filter, setFilter]   = useState<"all" | Status | "legacy">("all");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy]       = useState<Record<string, boolean>>({});
  const [backfilling, setBackfilling] = useState(false);
  const [backfillDone, setBackfillDone] = useState<number | null>(null);

  const loadSounds = useCallback(async (k: Kind = kind) => {
    setLoading(true);
    const res = await fetch(`/api/admin/${k}`);
    if (res.ok) setSounds(await res.json() as Sound[]);
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    fetch("/api/admin/sounds").then((r) => {
      if (r.ok) {
        setAuthed(true);
        r.json().then((d: Sound[]) => setSounds(d));
      } else {
        setAuthed(false);
      }
    });
  }, []);

  const switchKind = (k: Kind) => {
    setKind(k);
    setFilter("all");
    loadSounds(k);
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setAuthed(true); loadSounds(); }
    else setLoginErr("Wrong password.");
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setPassword("");
    setSounds([]);
  };

  const setStatus = async (s: Sound, status: Status) => {
    setBusy((b) => ({ ...b, [s.id]: true }));
    setSounds((prev) => prev.map((p) => p.id === s.id ? { ...p, status } : p));
    await fetch(`/api/admin/${kind}/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy((b) => ({ ...b, [s.id]: false }));
  };

  const deleteSound = async (s: Sound) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    setBusy((b) => ({ ...b, [s.id]: true }));
    await fetch(`/api/admin/${kind}/${s.id}`, { method: "DELETE" });
    setSounds((prev) => prev.filter((p) => p.id !== s.id));
  };

  const backfill = async () => {
    setBackfilling(true);
    const res = await fetch("/api/admin/backfill", { method: "POST" });
    if (res.ok) {
      const { updated } = await res.json() as { updated: number };
      setBackfillDone(updated);
      await loadSounds();
    }
    setBackfilling(false);
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const pending  = sounds.filter((s) => s.status === "pending");
  const approved = sounds.filter((s) => s.status === "approved");
  const hidden   = sounds.filter((s) => s.status === "hidden");
  const legacy   = sounds.filter((s) => !s.status);

  const noun = kind === "sounds" ? "sound" : "gif";

  const filtered = sounds.filter((s) => {
    const matchQ = !query || s.name.toLowerCase().includes(query.toLowerCase()) || (s.category ?? "").toLowerCase().includes(query.toLowerCase());
    const matchF = filter === "all" || statusOf(s) === filter;
    return matchQ && matchF;
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  if (authed === null) {
    return <div style={S.page}><div style={{ color: "var(--muted)", fontSize: 14 }}>Checking session…</div></div>;
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={S.page}>
        <div style={S.loginBox}>
          <div style={S.logoWrap}>
            <span style={{ color: "#ff2d87" }}>meme</span>music
            <span style={S.logoFun}>.fun</span>
          </div>
          <h1 style={S.loginTitle}>Admin</h1>
          <p style={S.loginSub}>Enter your admin password to manage sounds.</p>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={S.input}
              autoFocus
            />
            {loginErr && <div style={S.errMsg}>{loginErr}</div>}
            <button type="submit" style={S.submitBtn}>Sign in →</button>
          </form>
          <Link href="/" style={S.backLink}>← Back to soundboard</Link>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)" }}>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/" style={S.logoRow}>
              <span style={{ color: "#ff2d87" }}>meme</span>music
              <span style={S.logoFun}>.fun</span>
            </Link>
            <span style={S.adminBadge}>Admin</span>
          </div>
          <button onClick={logout} style={S.logoutBtn}><LogOut size={13} /> Sign out</button>
        </div>
      </header>

      <main style={S.main}>

        {/* Kind tabs */}
        <div style={S.kindTabs}>
          <button
            onClick={() => switchKind("sounds")}
            style={{ ...S.kindTab, ...(kind === "sounds" ? S.kindTabActive : {}) }}
          >
            🔊 Sounds
          </button>
          <button
            onClick={() => switchKind("gifs")}
            style={{ ...S.kindTab, ...(kind === "gifs" ? S.kindTabActive : {}) }}
          >
            🎞️ GIFs
          </button>
        </div>

        {/* Stats row */}
        <div style={S.stats}>
          {[
            { label: "Total",    value: sounds.length, color: "#7c3aed" },
            { label: "Pending",  value: pending.length,  color: "#f59e0b" },
            { label: "Approved", value: approved.length, color: "#10b981" },
            { label: "Hidden",   value: hidden.length,   color: "#ef4444" },
            { label: "Legacy",   value: legacy.length,   color: "#6366f1" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => setFilter(s.label.toLowerCase() as typeof filter)}
              style={{
                ...S.statCard,
                borderColor: filter === s.label.toLowerCase() ? `${s.color}60` : `${s.color}20`,
                background: filter === s.label.toLowerCase() ? `${s.color}10` : "#0f0f1e",
                cursor: "pointer",
              }}
            >
              <div style={{ ...S.statNum, color: s.color }}>{s.value}</div>
              <div style={S.statLabel}>{s.label}</div>
            </button>
          ))}
          <button
            onClick={() => setFilter("all")}
            style={{
              ...S.statCard,
              borderColor: filter === "all" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
              background: filter === "all" ? "rgba(255,255,255,0.04)" : "#0f0f1e",
              cursor: "pointer",
            }}
          >
            <div style={{ ...S.statNum, color: "var(--text)" }}>All</div>
            <div style={S.statLabel}>Show all</div>
          </button>
        </div>

        {/* Pending queue banner */}
        {pending.length > 0 && (
          <div style={S.pendingBanner}>
            <Clock size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <span><b style={{ color: "#f59e0b" }}>{pending.length} {noun}{pending.length !== 1 ? "s" : ""} waiting for review.</b> Approve or reject below.</span>
          </div>
        )}

        {/* Legacy backfill banner */}
        {legacy.length > 0 && (
          <div style={S.legacyBanner}>
            <span style={{ flex: 1 }}>
              <b style={{ color: "#6366f1" }}>{legacy.length} legacy sound{legacy.length !== 1 ? "s" : ""}</b> have no status (uploaded before review system).
              {backfillDone !== null && <span style={{ color: "#10b981", marginLeft: 8 }}>✓ {backfillDone} marked as Approved.</span>}
            </span>
            <button
              onClick={backfill}
              disabled={backfilling}
              style={S.backfillBtn}
            >
              {backfilling ? "Marking…" : "Mark all as Approved"}
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div style={S.toolbar}>
          <div style={S.searchWrap}>
            <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${noun}s…`}
              style={S.searchInput}
            />
            {query && <button onClick={() => setQuery("")} style={S.iconBtn}><X size={13} /></button>}
          </div>
          <div style={S.resultCount}>{filtered.length} {noun}{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={S.emptyState}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={S.emptyState}>No {noun}s found.</div>
        ) : (
          <div style={S.table}>
            {filtered.map((s) => {
              const color  = CAT_COLORS[s.category] ?? "#6366f1";
              const st     = statusOf(s);
              const meta   = STATUS_META[st];
              const isBusy = busy[s.id];

              return (
                <div
                  key={s.id}
                  style={{
                    ...S.row,
                    opacity: isBusy ? 0.5 : 1,
                    borderColor: st === "pending" ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)",
                    background:  st === "pending" ? "rgba(245,158,11,0.04)" : "#0f0f1e",
                  }}
                >
                  {/* Left: name + meta */}
                  <div style={S.rowMain}>
                    <div style={{ ...S.catDot, background: color }} />
                    <div style={S.rowInfo}>
                      <div style={S.rowName}>{s.name}</div>
                      <div style={S.rowSub}>
                        <span style={{ ...S.catChip, color, background: `${color}18` }}>{s.category}</span>
                        {s.dur && <span style={S.metaChip}>{s.dur}</span>}
                        {(s.downloads ?? 0) > 0 && <span style={S.metaChip}>↓{s.downloads}</span>}
                        {s.createdAt && <span style={S.metaChip}>{fmt(s.createdAt)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ ...S.statusBadge, color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </div>

                  {/* Actions */}
                  <div style={S.rowActions}>
                    {st === "pending" && (
                      <>
                        <button
                          onClick={() => setStatus(s, "approved")}
                          disabled={isBusy}
                          style={{ ...S.actionBtn, color: "#10b981", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)" }}
                          title="Approve"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => setStatus(s, "hidden")}
                          disabled={isBusy}
                          style={{ ...S.actionBtn, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                          title="Reject"
                        >
                          <Ban size={14} /> Reject
                        </button>
                      </>
                    )}
                    {(st === "approved" || st === "legacy") && (
                      <button
                        onClick={() => setStatus(s, "hidden")}
                        disabled={isBusy}
                        style={{ ...S.actionBtn, color: "var(--muted)" }}
                        title="Hide from feed"
                      >
                        <EyeOff size={14} /> Hide
                      </button>
                    )}
                    {st === "hidden" && (
                      <button
                        onClick={() => setStatus(s, "approved")}
                        disabled={isBusy}
                        style={{ ...S.actionBtn, color: "#10b981" }}
                        title="Restore to feed"
                      >
                        <Eye size={14} /> Restore
                      </button>
                    )}
                    <button
                      onClick={() => deleteSound(s)}
                      disabled={isBusy}
                      style={{ ...S.actionBtn, color: "#ef4444" }}
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 20 },
  loginBox: {
    width: "100%", maxWidth: 380, background: "#0f0f1e", borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.07)", padding: "36px 32px",
    display: "flex", flexDirection: "column", gap: 4,
  },
  logoWrap: {
    fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
    letterSpacing: "-0.03em", display: "flex", alignItems: "baseline", gap: 1, marginBottom: 20,
  },
  logoFun: { color: "#ff2d87", fontSize: 11, opacity: 0.6, marginLeft: 2 },
  loginTitle: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" },
  loginSub: { color: "var(--muted)", fontSize: 14, margin: "0 0 20px" },
  input: {
    background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, padding: "11px 14px", color: "var(--text)",
    fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
  },
  errMsg: { color: "#ff8f7a", fontSize: 13 },
  submitBtn: {
    background: "linear-gradient(135deg, #ff2d87, #c4206d)", color: "#fff",
    border: "none", borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(255,45,135,0.3)",
  },
  backLink: { color: "var(--muted)", fontSize: 13, marginTop: 16, display: "block", textAlign: "center" },
  header: {
    borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(6,6,16,0.97)",
    backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10,
  },
  headerInner: {
    maxWidth: 960, margin: "0 auto", padding: "14px 20px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  logoRow: {
    fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
    letterSpacing: "-0.03em", display: "flex", alignItems: "baseline", gap: 1,
  },
  adminBadge: {
    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
    background: "rgba(255,45,135,0.15)", color: "#ff2d87", border: "1px solid rgba(255,45,135,0.3)",
  },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 6, background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)",
    borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer",
  },
  main: { maxWidth: 960, margin: "0 auto", padding: "28px 20px 80px" },
  kindTabs: { display: "flex", gap: 8, marginBottom: 18 },
  kindTab: {
    background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
    color: "var(--muted)", borderRadius: 10, padding: "8px 16px",
    fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
  kindTabActive: {
    background: "rgba(255,45,135,0.12)", borderColor: "rgba(255,45,135,0.35)", color: "#ff2d87",
  },
  stats: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  statCard: {
    flex: "1 1 90px", padding: "14px 16px", borderRadius: 12, border: "1px solid",
    textAlign: "left" as const, fontFamily: "inherit",
  },
  statNum: { fontSize: 26, fontWeight: 800, fontFamily: "var(--font-display)", lineHeight: 1 },
  statLabel: { fontSize: 11, color: "var(--muted)", marginTop: 4, fontWeight: 500 },
  pendingBanner: {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
    borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 12, color: "var(--text2)",
  },
  legacyBanner: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const,
    background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: 12, padding: "12px 16px", fontSize: 14, marginBottom: 16, color: "var(--text2)",
  },
  backfillBtn: {
    background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)",
    color: "#818cf8", borderRadius: 8, padding: "7px 14px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit",
  },
  toolbar: { display: "flex", gap: 12, marginBottom: 14, alignItems: "center" },
  searchWrap: {
    flex: 1, display: "flex", alignItems: "center", gap: 8,
    background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10, padding: "9px 12px",
  },
  searchInput: {
    flex: 1, minWidth: 0, background: "transparent", border: "none",
    color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none",
  },
  iconBtn: { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "grid", placeItems: "center" },
  resultCount: { fontSize: 13, color: "var(--muted)", flexShrink: 0 },
  table: { display: "flex", flexDirection: "column", gap: 4 },
  row: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    borderRadius: 12, border: "1px solid", transition: "opacity 0.15s",
  },
  rowMain: { flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  catDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowSub: { display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" as const },
  catChip: { fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999 },
  metaChip: { fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-data)", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 5 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, flexShrink: 0 },
  rowActions: { display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" as const },
  actionBtn: {
    display: "flex", alignItems: "center", gap: 5, background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 10px",
    cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s",
  },
  emptyState: { textAlign: "center", color: "var(--muted)", padding: "60px 20px", fontSize: 15 },
};
