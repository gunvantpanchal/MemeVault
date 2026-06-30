"use client";

import React, { useState, useRef, useCallback, CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Play, Check, AlertCircle } from "lucide-react";
import { isFirebaseConfigured, storage } from "@/lib/firebase";
import { getEngine } from "@/lib/audio";

const CATEGORIES = [
  "Trending", "Memes", "Bollywood", "Anime", "Gaming",
  "Viral", "Reactions", "FX", "Alerts", "Music",
];

type UploadStatus = null | "uploading" | "done" | { error: string };

export default function UploadForm() {
  const [file, setFile]         = useState<File | null>(null);
  const [name, setName]         = useState("");
  const [category, setCategory] = useState("Memes");
  const [hotkey, setHotkey]     = useState("");
  const [dur, setDur]           = useState("");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState<UploadStatus>(null);
  const [progressUrl, setProgressUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = useCallback((f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("audio/")) {
      setStatus({ error: "That's not an audio file. Use .mp3, .ogg, .wav, or .m4a." });
      return;
    }
    setStatus(null);
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    const url = URL.createObjectURL(f);
    setProgressUrl(url);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const s = Math.round(a.duration || 0);
      setDur(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    };
    a.src = url;
  }, [name]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  const preview = () => {
    if (progressUrl) getEngine().playUrl(progressUrl).catch(() => {});
  };

  const submit = async () => {
    if (!file || !name.trim()) {
      setStatus({ error: "Pick a file and give it a name first." });
      return;
    }
    if (!isFirebaseConfigured || !storage) {
      setStatus({ error: "Firebase Storage is required for uploads — add your keys to .env.local." });
      return;
    }
    setStatus("uploading");
    try {
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const safe      = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath  = `sounds/${Date.now()}-${safe}`;
      const sref      = ref(storage, filePath);
      await uploadBytes(sref, file);
      const firebaseUrl = await getDownloadURL(sref);

      const res = await fetch("/api/sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category, filename: safe, firebaseUrl, dur, storagePath: filePath }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Save failed (${res.status}) — is MONGODB_URI set in .env.local?`);
      }

      setStatus("done");
      setFile(null); setName(""); setHotkey(""); setDur(""); setProgressUrl(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      console.error(e);
      setStatus({ error: (e as Error)?.message || "Upload failed. Check your Storage rules and try again." });
    }
  };

  return (
    <div style={S.root}>
      <div style={S.shell}>
        <Link href="/" style={S.back}><ArrowLeft size={16} /> Back to MemeVault</Link>
        <h1 style={S.h1}>Add a sound</h1>
        <p style={S.sub}>
          Upload a meme sound clip you own or that is cleared for reuse (CC0 / royalty-free).
          It goes straight into your MemeVault via Firebase Storage.
        </p>

        {!isFirebaseConfigured && (
          <div style={S.warn}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <b>Firebase not connected.</b> Add your keys to <code style={S.code}>.env.local</code> to
              enable uploads — see <code style={S.code}>.env.local.example</code> for the required values.
            </div>
          </div>
        )}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{ ...S.drop, ...(dragging ? S.dropActive : {}), ...(file ? S.dropFilled : {}) }}
        >
          <input ref={inputRef} type="file" accept="audio/*" hidden
            onChange={(e) => onPick(e.target.files?.[0])} />
          <UploadCloud size={28} style={{ color: file ? "var(--accent)" : "var(--muted)" }} />
          {file ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>{file.name}</div>
              <div style={S.fileMeta}>{(file.size / 1024).toFixed(0)} KB{dur ? ` · ${dur}` : ""}</div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>Drop your meme sound here</div>
              <div style={{ fontSize: 13 }}>or click to browse — mp3, ogg, wav, m4a</div>
            </div>
          )}
          {file && (
            <button onClick={(e) => { e.stopPropagation(); preview(); }} style={S.previewBtn}>
              <Play size={14} fill="currentColor" /> Preview
            </button>
          )}
        </div>

        <label style={S.label}>Name
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Victory horn" style={S.input} />
        </label>

        <div style={S.row}>
          <label style={{ ...S.label, flex: 1 }}>Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.input}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ ...S.label, width: 130 }}>Hotkey
            <input value={hotkey} maxLength={1}
              onChange={(e) => setHotkey(e.target.value.toUpperCase())}
              placeholder="A" style={{ ...S.input, textAlign: "center", fontFamily: "var(--font-data)" }} />
          </label>
        </div>

        <button onClick={submit} disabled={status === "uploading"} style={S.submit}>
          {status === "uploading" ? "Uploading…" : "Save to board"}
        </button>

        {status === "done" && (
          <div style={S.ok}><Check size={16} /> Saved! <Link href="/" style={{ color: "var(--accent)", fontWeight: 700 }}>Back to MemeVault →</Link></div>
        )}
        {typeof status === "object" && status !== null && "error" in status && (
          <div style={S.err}><AlertCircle size={16} /> {status.error}</div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  root: { minHeight: "100vh", display: "grid", placeItems: "start center", padding: "40px 16px" },
  shell: { width: "100%", maxWidth: 540 },
  back: { display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 14, marginBottom: 22 },
  h1: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, margin: "0 0 8px", letterSpacing: "-0.02em" },
  sub: { color: "var(--muted)", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 22px" },
  warn: {
    display: "flex", gap: 10, background: "rgba(255,107,74,.1)", border: "1px solid rgba(255,107,74,.32)",
    color: "#ffd9cd", borderRadius: 12, padding: "12px 14px", fontSize: 13.5, lineHeight: 1.55, marginBottom: 22,
  },
  code: { fontFamily: "var(--font-data)", background: "rgba(0,0,0,.3)", padding: "1px 5px", borderRadius: 5 },
  drop: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer",
    border: "2px dashed var(--line)", borderRadius: 16, padding: "34px 20px",
    background: "var(--surface)", marginBottom: 20, transition: "all .15s",
  },
  dropActive: { borderColor: "var(--accent)", background: "rgba(255,107,74,.07)" },
  dropFilled: { borderStyle: "solid", borderColor: "rgba(255,107,74,.4)" },
  fileMeta: { fontFamily: "var(--font-data)", fontSize: 12.5, color: "var(--muted)", marginTop: 4 },
  previewBtn: {
    display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
    background: "var(--bg)", color: "var(--text)", border: "1px solid var(--line)",
    borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  },
  label: { display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 16 },
  input: {
    background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10,
    padding: "11px 13px", color: "var(--text)", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
  },
  row: { display: "flex", gap: 12 },
  submit: {
    width: "100%", cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none",
    borderRadius: 11, padding: "13px", fontSize: 15.5, fontWeight: 700, fontFamily: "inherit", marginTop: 4,
    boxShadow: "0 4px 0 rgba(255,45,135,0.3)",
  },
  ok: { display: "flex", alignItems: "center", gap: 8, color: "#54E39B", fontSize: 14, marginTop: 16 },
  err: { display: "flex", alignItems: "center", gap: 8, color: "#ff8f7a", fontSize: 14, marginTop: 16, lineHeight: 1.5 },
};
