"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import Image from "next/image";

interface Props {
  onFileSelected: (file: File) => void;
}

const CORNER_POSITIONS = [
  { top: 0, left: 0, rotate: "0deg" },
  { top: 0, right: 0, rotate: "90deg" },
  { bottom: 0, right: 0, rotate: "180deg" },
  { bottom: 0, left: 0, rotate: "270deg" },
] as const;

export default function ImageUploader({ onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    onFileSelected(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div
      style={{ position: "relative", cursor: "pointer" }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={onChange} />

      {/* Corner brackets */}
      {CORNER_POSITIONS.map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 14, height: 14,
            zIndex: 2,
            transform: `rotate(${pos.rotate})`,
            animation: `blink ${1.4 + i * 0.15}s ease-in-out infinite`,
            animationDelay: `${i * 150}ms`,
            ...pos,
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 1, background: "var(--amber)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: "100%", background: "var(--amber)" }} />
        </div>
      ))}

      {/* Drop zone */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        background: dragging ? "rgba(245,158,11,0.04)" : "var(--bg-mid)",
        border: `1px solid ${dragging ? "var(--amber)" : "var(--bg-border)"}`,
        boxShadow: dragging ? "0 0 24px var(--amber-glow), inset 0 0 24px var(--amber-glow)" : "none",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        minHeight: preview ? 260 : 200,
      }}>

        {/* Drag scan beam */}
        {dragging && (
          <div style={{
            position: "absolute", left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, var(--amber), transparent)",
            boxShadow: "0 0 8px var(--amber)",
            animation: "scanBeam 1.4s linear infinite",
            zIndex: 10,
          }} />
        )}

        {preview ? (
          <div style={{ position: "relative", minHeight: 260 }}>
            <Image src={preview} alt="Preview" fill style={{ objectFit: "contain", padding: 12 }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "20px 14px 10px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
            }}>
              <p className="f-mono" style={{ fontSize: 10, color: "var(--amber)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                ▶ {fileName}
              </p>
              <p className="f-mono" style={{ fontSize: 10, color: "var(--text-secondary)", margin: "3px 0 0", letterSpacing: "0.1em" }}>
                LOADED — READY FOR ANALYSIS
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "48px 32px", gap: 16,
          }}>
            {/* Reticle icon */}
            <div style={{ position: "relative", width: 52, height: 52 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid var(--bg-border)" }} />
              <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "1px solid var(--text-muted)" }} />
              {/* Crosshairs */}
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--text-muted)", transform: "translateY(-0.5px)" }} />
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--text-muted)", transform: "translateX(-0.5px)" }} />
              {/* Arrow */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <p className="f-display" style={{ fontSize: 14, color: "var(--text-primary)", letterSpacing: "0.12em", margin: 0 }}>
                DROP IMAGE HERE
              </p>
              <p className="f-mono" style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 6, letterSpacing: "0.08em" }}>
                or click to select · JPG / PNG
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 220 }}>
              <div style={{ flex: 1, height: 1, background: "var(--bg-border)" }} />
              <span className="f-mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.15em" }}>SYS:INPUT</span>
              <div style={{ flex: 1, height: 1, background: "var(--bg-border)" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
