"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  originalUrl: string;
  overlayUrl: string;
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br"; color?: string }) {
  const c = "var(--amber-dim)";
  const s: React.CSSProperties = { position: "absolute", width: 12, height: 12,
    top: pos.startsWith("t") ? 8 : undefined,
    bottom: pos.startsWith("b") ? 8 : undefined,
    left: pos.endsWith("l") ? 8 : undefined,
    right: pos.endsWith("r") ? 8 : undefined,
  };
  return (
    <div style={s}>
      <div style={{ position:"absolute", top:0, left:0, width:"100%", height:1, background:c }} />
      <div style={{ position:"absolute", top:0, left:0, width:1, height:"100%", background:c }} />
    </div>
  );
}

export default function ResultView({ originalUrl, overlayUrl }: Props) {
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div style={{ width: "100%", maxWidth: 1100, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Top bar ─────────────────────────────────── */}
      <div className="a-up d0" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--green)", boxShadow: "0 0 8px var(--green-glow)",
            animation: "blink 2.5s ease-in-out infinite",
          }} />
          <span className="fm" style={{ fontSize: 10, color: "var(--green)", letterSpacing: "0.18em" }}>ANALYSIS COMPLETE</span>
          <div style={{ width: 1, height: 12, background: "var(--bg-border-hi)" }} />
          <span className="fm" style={{ fontSize: 9, color: "var(--txt-mid)" }}>RUCNet · CrackSeg9k</span>
        </div>

        {/* Overlay toggle */}
        <button
          onClick={() => setShowOverlay(v => !v)}
          className="fm"
          style={{
            fontSize: 9, padding: "4px 12px", letterSpacing: "0.12em",
            background: "none", cursor: "pointer",
            border: `1px solid ${showOverlay ? "var(--amber)" : "var(--bg-border-hi)"}`,
            color: showOverlay ? "var(--amber)" : "var(--txt-mid)",
            transition: "all 0.2s",
          }}
        >
          OVERLAY {showOverlay ? "ON" : "OFF"}
        </button>
      </div>

      {/* ── Image panels ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Original */}
        <div className="a-sl d1" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 2, height: 14, background: "var(--txt-mid)" }} />
              <span className="fm" style={{ fontSize: 9, color: "var(--txt-mid)", letterSpacing: "0.18em" }}>INPUT / ORIGINAL</span>
            </div>
            <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>CH:01</span>
          </div>
          <div style={{
            position: "relative", aspectRatio: "4 / 3",
            background: "var(--bg-mid)",
            border: "1px solid var(--bg-border)",
            overflow: "hidden",
          }}>
            <Image src={originalUrl} alt="Original" fill style={{ objectFit: "contain", padding: 12 }} />
            <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
          </div>
        </div>

        {/* Segmentation */}
        <div className="a-sr d2" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 2, height: 14, background: "var(--amber)" }} />
              <span className="fm" style={{ fontSize: 9, color: "var(--amber)", letterSpacing: "0.18em" }}>SEGMENTATION MASK</span>
            </div>
            <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>CH:02</span>
          </div>
          <div style={{
            position: "relative", aspectRatio: "4 / 3",
            background: "var(--bg-mid)",
            border: `1px solid ${showOverlay ? "var(--amber-faint)" : "var(--bg-border)"}`,
            boxShadow: showOverlay ? "0 0 24px var(--amber-glow)" : "none",
            overflow: "hidden",
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}>
            <Image
              src={overlayUrl}
              alt="Segmentation"
              fill
              style={{
                objectFit: "contain", padding: 12,
                opacity: showOverlay ? 1 : 0,
                transition: "opacity 0.3s ease",
                animation: "wipeReveal 0.9s cubic-bezier(0.16,1,0.3,1) both",
              }}
            />
            {/* Scan sweep */}
            <div style={{
              position: "absolute", left: 0, right: 0, height: 1,
              background: "linear-gradient(90deg, transparent, var(--amber), transparent)",
              boxShadow: "0 0 6px var(--amber)",
              animation: "scanBeam 1.8s linear forwards",
              pointerEvents: "none",
            }} />
            <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
          </div>
        </div>
      </div>

      {/* ── Meta bar ────────────────────────────────── */}
      <div className="a-up d4" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "var(--bg-panel)",
        border: "1px solid var(--bg-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[
            ["MODEL",   "RUCNet"],
            ["DATASET", "CrackSeg9k"],
            ["CLASSES", "2"],
            ["INPUT",   "400 × 400"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="fm" style={{ fontSize: 9, color: "var(--txt-lo)" }}>{k}:</span>
              <span className="fm" style={{ fontSize: 9, color: "var(--txt-mid)" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 5px var(--green-glow)" }} />
          <span className="fm" style={{ fontSize: 9, color: "var(--txt-mid)" }}>STATUS: OK</span>
        </div>
      </div>
    </div>
  );
}
