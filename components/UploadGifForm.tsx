"use client";

import React, { useState, useRef, useCallback, CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Check, AlertCircle } from "lucide-react";
import { GifMedia } from "@/components/GifMedia";

const CATEGORIES = [
  "Trending", "Memes", "Reactions", "Funny", "Anime", "Gaming", "Viral", "Animals",
];

const ALLOWED_TYPES = ["image/gif", "image/webp", "video/mp4", "video/webm"];

type UploadStatus = null | "uploading" | "done" | { error: string };

export default function UploadGifForm() {
  const [file, setFile]         = useState<File | null>(null);
  const [name, setName]         = useState("");
  const [category, setCategory] = useState("Memes");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState<UploadStatus>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = useCallback((f: File | null | undefined) => {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setStatus({ error: "Unsupported file. Use .gif, .webp, .mp4, or .webm." });
      return;
    }
    setStatus(null);
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    setPreviewUrl(URL.createObjectURL(f));
  }, [name]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  const submit = async () => {
    if (!file || !name.trim()) {
      setStatus({ error: "Pick a file and give it a name first." });
      return;
    }
    setStatus("uploading");
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const form = new FormData();
      form.append("file", file);
      form.append("filename", safe);
      const uploadRes = await fetch("/api/gif-upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Upload failed (${uploadRes.status})`);
      }
      const { firebaseUrl, storagePath } = await uploadRes.json() as {
        firebaseUrl: string;
        storagePath: string;
      };

      const res = await fetch("/api/gifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category, filename: safe, firebaseUrl, storagePath }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Save failed (${res.status}) — is MONGODB_URI set in .env.local?`);
      }

      setStatus("done");
      setFile(null); setName(""); setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      console.error(e);
      setStatus({ error: (e as Error)?.message || "Upload failed. Try again." });
    }
  };

  return (
    <div style={S.root}>
      <div style={S.shell}>
        <Link href="/gifs" style={S.back}><ArrowLeft size={16} /> Back to GifVault</Link>
        <h1 style={S.h1}>Add a GIF</h1>
        <p style={S.sub}>
          Upload a meme GIF or clip you own or that is cleared for reuse (CC0 / royalty-free).
          It goes straight into GifVault via Firebase Storage.
        </p>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{ ...S.drop, ...(dragging ? S.dropActive : {}), ...(file ? S.dropFilled : {}) }}
        >
          <input ref={inputRef} type="file" accept="image/gif,image/webp,video/mp4,video/webm" hidden
            onChange={(e) => onPick(e.target.files?.[0])} />
          {file && previewUrl ? (
            <div style={{ width: "100%", maxWidth: 220 }}>
              <div style={{ borderRadius: 12, overflow: "hidden" }}>
                <GifMedia url={previewUrl} name={name || "preview"} />
              </div>
              <div style={S.fileMeta}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          ) : (
            <>
              <UploadCloud size={28} style={{ color: "var(--muted)" }} />
              <div style={{ textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>Drop your meme GIF here</div>
                <div style={{ fontSize: 13 }}>or click to browse — gif, webp, mp4, webm</div>
              </div>
            </>
          )}
        </div>

        <label style={S.label}>Name
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Surprised Pikachu" style={S.input} />
        </label>

        <label style={S.label}>Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.input}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <button onClick={submit} disabled={status === "uploading"} style={S.submit}>
          {status === "uploading" ? "Uploading…" : "Save to vault"}
        </button>

        {status === "done" && (
          <div style={S.ok}><Check size={16} /> Saved! <Link href="/gifs" style={{ color: "var(--accent)", fontWeight: 700 }}>Back to GifVault →</Link></div>
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
  drop: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer",
    borderWidth: "2px", borderStyle: "dashed", borderColor: "var(--border)",
    borderRadius: 16, padding: "34px 20px",
    background: "var(--surface)", marginBottom: 20, transition: "all .15s",
  },
  dropActive: { borderColor: "var(--accent)", background: "rgba(255,45,135,.07)" },
  dropFilled: { borderStyle: "solid", borderColor: "rgba(255,45,135,.4)" },
  fileMeta: { fontFamily: "var(--font-data)", fontSize: 12.5, color: "var(--muted)", marginTop: 6, textAlign: "center" },
  label: { display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 16 },
  input: {
    background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10,
    padding: "11px 13px", color: "var(--text)", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
  },
  submit: {
    width: "100%", cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none",
    borderRadius: 11, padding: "13px", fontSize: 15.5, fontWeight: 700, fontFamily: "inherit", marginTop: 4,
    boxShadow: "0 4px 0 rgba(255,45,135,0.3)",
  },
  ok: { display: "flex", alignItems: "center", gap: 8, color: "#54E39B", fontSize: 14, marginTop: 16 },
  err: { display: "flex", alignItems: "center", gap: 8, color: "#ff8f7a", fontSize: 14, marginTop: 16, lineHeight: 1.5 },
};
