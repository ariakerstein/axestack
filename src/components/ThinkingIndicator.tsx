'use client'

const VARIANTS = {
  dark: {
    core: "#ffffff",
    ring: "#ffffff",
    e1: "#d4876a",
    e2: "#a8b8d4",
    e3: "#a8c8b4",
  },
  light: {
    core: "#0a0a0a",
    ring: "#0a0a0a",
    e1: "#a85c3e",
    e2: "#7a7570",
    e3: "#7a9080",
  },
}

interface ThinkingIndicatorProps {
  size?: number
  variant?: 'light' | 'dark'
  className?: string
}

export function ThinkingIndicator({ size = 48, variant = "light", className = "" }: ThinkingIndicatorProps) {
  const v = VARIANTS[variant]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-label="Thinking"
      role="status"
      style={{ flexShrink: 0 }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .oc-o1 { animation: oc-orb1 1.8s linear infinite; }
          .oc-o2 { animation: oc-orb2 2.7s linear infinite; }
          .oc-o3 { animation: oc-orb3 3.3s linear infinite; }
          .oc-core { animation: oc-pulse 2s ease-in-out infinite; }
        }
        @keyframes oc-orb1 {
          from { transform: rotate(0deg) translateX(14px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(14px) rotate(-360deg); }
        }
        @keyframes oc-orb2 {
          from { transform: rotate(120deg) translateX(18px) rotate(-120deg); }
          to   { transform: rotate(480deg) translateX(18px) rotate(-480deg); }
        }
        @keyframes oc-orb3 {
          from { transform: rotate(240deg) translateX(22px) rotate(-240deg); }
          to   { transform: rotate(600deg) translateX(22px) rotate(-600deg); }
        }
        @keyframes oc-pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      {/* Orbit rings - 3 planes */}
      <ellipse cx="24" cy="24" rx="14" ry="5"
        fill="none" stroke={v.ring} strokeWidth="0.6" strokeOpacity="0.18"
        transform="rotate(-10 24 24)" />
      <ellipse cx="24" cy="24" rx="18" ry="6"
        fill="none" stroke={v.ring} strokeWidth="0.6" strokeOpacity="0.14"
        transform="rotate(50 24 24)" />
      <ellipse cx="24" cy="24" rx="22" ry="5"
        fill="none" stroke={v.ring} strokeWidth="0.6" strokeOpacity="0.1"
        transform="rotate(110 24 24)" />

      {/* Core */}
      <circle cx="24" cy="24" r="4" fill={v.core} className="oc-core" />

      {/* Electron 1 - terracotta */}
      <g transform="translate(24 24) rotate(-10)">
        <g className="oc-o1">
          <circle r="2.5" fill={v.e1} />
        </g>
      </g>

      {/* Electron 2 */}
      <g transform="translate(24 24) rotate(50)">
        <g className="oc-o2">
          <circle r="2" fill={v.e2} />
        </g>
      </g>

      {/* Electron 3 */}
      <g transform="translate(24 24) rotate(110)">
        <g className="oc-o3">
          <circle r="2" fill={v.e3} />
        </g>
      </g>
    </svg>
  )
}

interface ThinkingBubbleProps {
  text?: string
}

export function ThinkingBubble({ text = "Navis is thinking..." }: ThinkingBubbleProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: "#f5f3ee",
      border: "0.5px solid #e8e4dc",
      borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px",
      width: "fit-content",
    }}>
      <ThinkingIndicator size={24} variant="light" />
      <span style={{
        fontSize: "13px",
        color: "#7a7570",
        fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      }}>
        {text}
      </span>
    </div>
  )
}
