const TICKS = Array.from({ length: 36 }, (_, i) => i * (360 / 36))

function MissionPatch({ size = 180 }) {
  return (
    <svg
      className="mission-patch"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Lunar Descent Trainer mission patch"
    >
      <defs>
        <radialGradient id="patchSky" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#102a63" />
          <stop offset="55%" stopColor="#0a1636" />
          <stop offset="100%" stopColor="#05060f" />
        </radialGradient>
        <linearGradient id="patchGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2740" />
          <stop offset="100%" stopColor="#0c0b14" />
        </linearGradient>
        <path id="topArc" d="M 26 100 A 74 74 0 0 1 174 100" />
        <path id="bottomArc" d="M 46 150 A 60 60 0 0 0 154 150" />
        <clipPath id="patchClip">
          <circle cx="100" cy="100" r="84" />
        </clipPath>
      </defs>

      {/* tick ring */}
      <g stroke="rgba(255,255,255,0.35)" strokeWidth="1">
        {TICKS.map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="8"
            x2="100"
            y2={deg % 90 === 0 ? 16 : 13}
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </g>

      <circle cx="100" cy="100" r="96" fill="none" stroke="#e5e7eb" strokeWidth="2" />
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="#fc3d21"
        strokeWidth="3"
        strokeDasharray="4 5"
      />

      <g clipPath="url(#patchClip)">
        <circle cx="100" cy="100" r="84" fill="url(#patchSky)" />

        {/* stars */}
        {[
          [34, 36], [150, 28], [168, 60], [30, 72], [58, 24], [128, 40], [172, 92], [26, 50],
        ].map(([sx, sy], i) => (
          <circle key={i} cx={sx} cy={sy} r={i % 2 === 0 ? 1.4 : 1} fill="#e8ecff" opacity="0.85" />
        ))}

        {/* crater-rim horizon, echoes the real terrain silhouette */}
        <path
          d="M 16 150 L 40 134 L 62 148 L 84 120 L 106 150 L 128 130 L 150 150 L 184 140 L 184 184 L 16 184 Z"
          fill="url(#patchGround)"
        />
        <path
          d="M 16 150 L 40 134 L 62 148 L 84 120 L 106 150 L 128 130 L 150 150 L 184 140"
          fill="none"
          stroke="#3d6fe0"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />

        {/* landing pad */}
        <rect x="88" y="148" width="24" height="2.5" fill="#e5e7eb" />
        <rect x="88" y="148" width="24" height="2.5" fill="#fc3d21" opacity="0.5" />

        {/* lander */}
        <g transform="translate(100 118)">
          <path d="M -5 18 L -11 24 M 5 18 L 11 24" stroke="#9ca3af" strokeWidth="1.6" />
          <path d="M 0 -10 L 8 14 L -8 14 Z" fill="#e5e7eb" />
          <circle cx="0" cy="-1" r="2.6" fill="#fc3d21" />
          <path d="M -4 16 L 0 28 L 4 16 Z" fill="#fbbf24" opacity="0.85" />
        </g>
      </g>

      <text fontFamily="'Space Mono', monospace" fontSize="10.5" fontWeight="700" fill="#e5e7eb" letterSpacing="2.5">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          LUNAR DESCENT TRAINER
        </textPath>
      </text>
      <text fontFamily="'Space Mono', monospace" fontSize="8" fill="#9ca3af" letterSpacing="1.5">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
          DE GERLACHE · 88.5°S
        </textPath>
      </text>
    </svg>
  )
}

export default MissionPatch
