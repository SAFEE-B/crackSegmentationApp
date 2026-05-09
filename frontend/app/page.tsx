"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ResultView from "@/components/ResultView";
import Spinner from "@/components/Spinner";
import { predict } from "@/lib/api";

type AppState = "idle" | "ready" | "loading" | "result" | "error";

function Dot({ color = "var(--amber)", glow = "var(--amber-glow-s)", delay = "0s" }) {
  return (
    <div style={{
      width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
      background: color, boxShadow: `0 0 5px ${glow}`,
      animation: `blink 3s ease-in-out ${delay} infinite`,
    }} />
  );
}

function Rule() {
  return <div style={{ height: 1, background: "var(--bg-border)", width: "100%" }} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");
  const [error, setError] = useState("");
  const [threshold, setThreshold] = useState(0.5);

  function handleFileSelected(file: File) {
    setSelectedFile(file);
    setOriginalUrl(URL.createObjectURL(file));
    setState("ready");
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setState("loading");
    setError("");
    try {
      const url = await predict(selectedFile, 1 - threshold);
      setOverlayUrl(url);
      setState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setOriginalUrl("");
    setOverlayUrl("");
    setError("");
    setState("idle");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* ══ HEADER ════════════════════════════════════ */}
      <header className="a-hdr d0" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 28px",
        borderBottom: "1px solid var(--bg-border)",
        background: "var(--bg-panel)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Logo */}
          <div style={{
            width: 30, height: 30, position: "relative", flexShrink: 0,
            border: "1px solid var(--amber)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ position: "absolute", inset: 5, border: "1px solid var(--amber-faint)" }} />
            <span className="fm" style={{ fontSize: 8, color: "var(--amber)", position: "relative", zIndex: 1 }}>CS</span>
          </div>
          <div>
            <div className="fd" style={{ fontSize: 17, color: "var(--txt-hi)", lineHeight: 1 }}>CRACKSEG</div>
            <div className="fm" style={{ fontSize: 8, color: "var(--txt-mid)", letterSpacing: "0.2em", marginTop: 2 }}>DIAGNOSTIC SYSTEM v1.0</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Dot delay="0s" />
            <span className="fm" style={{ fontSize: 9, color: "var(--txt-mid)" }}>MODEL READY</span>
          </div>
          <div style={{ width: 1, height: 14, background: "var(--bg-border-hi)" }} />
          <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>RUCNet · CrackSeg9k · 100K iters</span>
        </div>
      </header>

      {/* ══ BODY ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Always-visible two-panel layout */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", overflow: "hidden" }}>

          {/* LEFT PANEL — controls & meta (always visible) */}
          <div style={{
            borderRight: "1px solid var(--bg-border)",
            background: "var(--bg-panel)",
            display: "flex", flexDirection: "column",
            padding: "28px 24px",
            gap: 28,
            overflowY: "auto",
          }}>

            {/* Title block */}
            <div className="a-up d0">
              <Label>System Input</Label>
              <h1 className="fd" style={{
                fontSize: "clamp(2.4rem, 4vw, 3.4rem)",
                lineHeight: 0.9, marginTop: 10, color: "var(--txt-hi)",
              }}>
                CRACK<br /><span style={{ color: "var(--amber)" }}>DETECT</span>
              </h1>
              <p className="fm" style={{ fontSize: 10, color: "var(--txt-mid)", marginTop: 12, lineHeight: 1.75, letterSpacing: "0.03em" }}>
                Upload a structural image. RUCNet segments crack regions at pixel level using semantic segmentation.
              </p>
            </div>

            <Rule />

            {/* Sensitivity */}
            <div className="a-up d1" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Label>Sensitivity</Label>
                <span className="fm" style={{ fontSize: 11, color: "var(--amber)" }}>{threshold.toFixed(2)}</span>
              </div>

              {/* Slider */}
              <div style={{ position: "relative", height: 18, display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "var(--bg-border-hi)" }} />
                <div style={{
                  position: "absolute", left: 0, height: 1,
                  width: `${((threshold - 0.05) / 0.90) * 100}%`,
                  background: "var(--amber)", boxShadow: "0 0 4px var(--amber)",
                }} />
                <input
                  type="range" min={0.05} max={0.95} step={0.01}
                  value={threshold}
                  onChange={e => setThreshold(parseFloat(e.target.value))}
                  style={{ position: "relative", zIndex: 1, width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="fm" style={{ fontSize: 8, color: "var(--txt-lo)" }}>FEWER</span>
                <span className="fm" style={{ fontSize: 9, color: "var(--txt-mid)" }}>
                  {threshold < 0.35 ? "STRICT" : threshold > 0.65 ? "SENSITIVE" : "BALANCED"}
                </span>
                <span className="fm" style={{ fontSize: 8, color: "var(--txt-lo)" }}>MORE</span>
              </div>
            </div>

            <Rule />

            {/* Model stats */}
            <div className="a-up d2" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Label>Model Info</Label>
              {[
                ["Architecture", "RUCNet"],
                ["Dataset", "CrackSeg9k"],
                ["Training iters", "100,000"],
                ["Input size", "400 × 400"],
                ["Classes", "2 (bg / crack)"],
                ["Backbone", "ResNet + SCSE"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)", flexShrink: 0 }}>{k}</span>
                  <div style={{ flex: 1, borderBottom: "1px dotted var(--bg-border-hi)", marginBottom: 2 }} />
                  <span className="fm" style={{ fontSize: 9, color: "var(--txt-mid)", flexShrink: 0 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Analyze button */}
            {(state === "ready" || state === "error") && (
              <div className="a-up d0">
                <button
                  onClick={handleAnalyze}
                  className="fd"
                  style={{
                    width: "100%", padding: "13px 0",
                    background: "var(--amber)", color: "#0a0a0a",
                    border: "none", cursor: "pointer",
                    fontSize: 13, letterSpacing: "0.2em",
                    position: "relative", overflow: "hidden",
                    animation: "pulseGlow 3s ease-in-out infinite",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "#fbbf24";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "var(--amber)";
                  }}
                >
                  RUN ANALYSIS
                </button>
              </div>
            )}

            {/* New scan button (result state) */}
            {state === "result" && (
              <div className="a-up d0">
                <button
                  onClick={handleReset}
                  className="fd"
                  style={{
                    width: "100%", padding: "13px 0",
                    background: "none", color: "var(--txt-mid)",
                    border: "1px solid var(--bg-border-hi)", cursor: "pointer",
                    fontSize: 13, letterSpacing: "0.2em",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = "var(--amber)";
                    el.style.color = "var(--amber)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = "var(--bg-border-hi)";
                    el.style.color = "var(--txt-mid)";
                  }}
                >
                  ↺ NEW SCAN
                </button>
              </div>
            )}

            {/* Error */}
            {state === "error" && (
              <div style={{
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.2)",
                padding: "10px 12px",
              }}>
                <p className="fm" style={{ fontSize: 9, color: "#fca5a5", lineHeight: 1.6 }}>{error}</p>
                <button
                  onClick={handleAnalyze}
                  className="fm"
                  style={{ fontSize: 9, color: "var(--txt-mid)", background: "none", border: "none", cursor: "pointer", marginTop: 6, letterSpacing: "0.1em" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--amber)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--txt-mid)"}
                >↻ RETRY</button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL — upload zone or result */}
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: state === "result" ? "32px 40px" : "40px",
            background: "var(--bg)",
            overflowY: "auto",
          }}>
            {state === "result" ? (
              <ResultView originalUrl={originalUrl} overlayUrl={overlayUrl} />
            ) : state === "loading" ? (
              <div className="a-in" style={{
                width: "100%", maxWidth: 520,
                background: "var(--bg-panel)",
                border: "1px solid var(--bg-border)",
                padding: "60px 40px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Spinner />
              </div>
            ) : (
              <div className="a-up d1" style={{ width: "100%", maxWidth: 560 }}>
                {/* Panel header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <Label>Image Input</Label>
                  <div style={{ flex: 1, height: 1, background: "var(--bg-border)" }} />
                  <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>JPG / PNG</span>
                </div>
                <ImageUploader onFileSelected={handleFileSelected} />

                {/* Idle hint */}
                {state === "idle" && (
                  <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 1, background: "var(--bg-border)" }} />
                    <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)", letterSpacing: "0.15em" }}>
                      AWAITING INPUT
                    </span>
                    <div style={{ flex: 1, height: 1, background: "var(--bg-border)" }} />
                  </div>
                )}
                {state === "ready" && (
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <Dot color="var(--amber)" glow="var(--amber-glow-s)" />
                    <span className="fm" style={{ fontSize: 9, color: "var(--amber)", letterSpacing: "0.12em" }}>
                      IMAGE LOADED — ADJUST SENSITIVITY AND RUN
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ FOOTER ════════════════════════════════════ */}
      <footer style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 28px",
        borderTop: "1px solid var(--bg-border)",
        background: "var(--bg-panel)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot color="var(--green)" glow="var(--green-glow)" delay="1s" />
          <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>BACKEND: localhost:8000</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>PaddlePaddle · CPU</span>
          <div style={{ width: 1, height: 10, background: "var(--bg-border-hi)" }} />
          <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>
            {state === "loading" ? "RUNNING INFERENCE..." : state === "result" ? "ANALYSIS COMPLETE" : "READY"}
          </span>
        </div>
      </footer>
    </div>
  );
}
