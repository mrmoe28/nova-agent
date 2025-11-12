"use client";

import React, { useMemo, useRef, useState } from "react";

type OCRBlock = { text: string; confidence?: number; bbox?: number[]; page?: number };
type OCRTable = { page: number; rows: string[][]; strategy?: string };
type OCRResponse = {
  file_name: string;
  mime_type?: string | null;
  pages: number;
  is_digital_pdf?: boolean | null;
  text: string;
  blocks: OCRBlock[];
  tables: OCRTable[];
  metadata: Record<string, unknown>;
};

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<OCRResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredText = useMemo(() => {
    if (!resp?.text) return "";
    if (!q.trim()) return resp.text;
    // simple search: show lines matching query
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return resp.text
      .split("\n")
      .filter((line) => regex.test(line))
      .join("\n");
  }, [resp, q]);

  async function handleUpload(e?: React.FormEvent) {
    e?.preventDefault();
    if (!file) return;
    setError(null);
    setLoading(true);
    setResp(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("want_tables", "true");

      // Call OCR microservice directly
      const r = await fetch("http://localhost:8002/extract", { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.detail || d?.error || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as OCRResponse;
      setResp(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setFile(null);
    setResp(null);
    setError(null);
    setQ("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function copyText(s: string) {
    navigator.clipboard.writeText(s);
  }

  function downloadJSON() {
    if (!resp) return;
    const blob = new Blob([JSON.stringify(resp, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resp.file_name.replace(/\.[^.]+$/, "") || "ocr"}-parsed.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-background">
      <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>NovaAgent · OCR Test</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Upload a PDF or image. We&apos;ll parse with PyMuPDF (digital) or OCR (scans) and show results below.
      </p>

      <form onSubmit={handleUpload} style={{ marginBottom: 20 }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          style={{
            border: "2px dashed #ddd",
            borderRadius: 12,
            padding: 24,
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1 }}>
            <strong>Drop file here</strong> or choose a file
            <div style={{ marginTop: 6, color: "#777", fontSize: 14 }}>
              Accepted: PDF, PNG, JPG, TIFF, WEBP
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            type="submit"
            disabled={!file || loading}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #111",
              background: loading ? "#eaeaea" : "#111",
              color: loading ? "#111" : "#fff",
              cursor: !file || loading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "Processing…" : "Upload & Parse"}
          </button>
          <button
            type="button"
            onClick={resetAll}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reset
          </button>
          {!!resp && (
            <button
              type="button"
              onClick={downloadJSON}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #0b5",
                background: "#0b5",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Download JSON
            </button>
          )}
        </div>
        {file && (
          <div style={{ marginTop: 8, fontSize: 14, color: "#333" }}>
            Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
          </div>
        )}
      </form>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 12, borderRadius: 10, marginBottom: 20 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {resp && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Summary</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, fontSize: 14 }}>
              <div><b>File</b>: {resp.file_name}</div>
              <div><b>Pages</b>: {resp.pages}</div>
              <div><b>MIME</b>: {resp.mime_type || "n/a"}</div>
              <div><b>Engine</b>: {String(resp.metadata?.engine || "unknown")}</div>
              <div><b>Digital PDF?</b>: {resp.is_digital_pdf === null ? "n/a" : resp.is_digital_pdf ? "Yes" : "No"}</div>
              <div><b>Tables</b>: {resp.tables?.length || 0}</div>
            </div>
          </section>

          <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Text</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search text…"
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", width: 240, color: "#000000", backgroundColor: "#ffffff" }}
                />
                <button
                  type="button"
                  onClick={() => copyText(filteredText || resp.text || "")}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fafafa", cursor: "pointer", color: "#000000" }}
                >
                  Copy
                </button>
              </div>
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 13,
                background: "#fafafa",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #eee",
                maxHeight: 420,
                overflow: "auto",
                marginTop: 8,
                color: "#000000",
              }}
            >
{filteredText || "(no text)"}
            </pre>
          </section>

          <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Tables</h2>
              {!!resp.tables?.length && (
                <button
                  type="button"
                  onClick={() => copyText(JSON.stringify(resp.tables, null, 2))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fafafa", cursor: "pointer" }}
                >
                  Copy JSON
                </button>
              )}
            </div>

            {(!resp.tables || resp.tables.length === 0) && <div style={{ color: "#666" }}>No tables detected.</div>}

            {resp.tables?.map((t, idx) => (
              <details key={idx} open style={{ marginBottom: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  Table {idx + 1} · Page {t.page} {t.strategy ? `· ${t.strategy}` : ""}
                </summary>
                <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8, marginTop: 8 }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                    <tbody>
                      {t.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              style={{
                                border: "1px solid #eee",
                                padding: "6px 8px",
                                whiteSpace: "pre-wrap",
                                verticalAlign: "top",
                              }}
                              title={cell}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </section>

          <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Blocks (first 200)</h2>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
              {resp.blocks?.length || 0} blocks total
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
              {(resp.blocks || []).slice(0, 200).map((b, i) => (
                <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{b.text}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {typeof b.confidence === "number" && <span>conf: {(b.confidence * 100).toFixed(1)}% · </span>}
                    {b.page ? <span>page: {b.page}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      </div>
    </div>
  );
}
