"use client";

export default function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      {/* Scanning ring */}
      <div style={{ position: "relative", width: 64, height: 64 }}>
        {/* Outer static ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "1px solid var(--bg-border)",
        }} />
        {/* Spinning arc */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "var(--amber)",
          borderRightColor: "rgba(245,158,11,0.25)",
          animation: "spin360 1.1s linear infinite",
        }} />
        {/* Inner ring */}
        <div style={{
          position: "absolute", inset: 10, borderRadius: "50%",
          border: "1px solid var(--bg-border)",
        }} />
        {/* Center dot */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--amber)",
            boxShadow: "0 0 8px var(--amber)",
            animation: "blink 1.1s ease-in-out infinite",
          }} />
        </div>
      </div>

      {/* Label */}
      <div style={{ textAlign: "center" }}>
        <p className="f-mono" style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.2em", margin: 0 }}>
          ANALYZING
        </p>
        <p className="f-mono" style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4, letterSpacing: "0.08em" }}>
          Running RUCNet inference
        </p>
      </div>

      {/* Progress shimmer bar */}
      <div style={{ width: 160, height: 1, background: "var(--bg-border)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent, var(--amber), transparent)",
          animation: "slideLeft 1.5s ease-in-out infinite",
        }} />
      </div>
    </div>
  );
}
