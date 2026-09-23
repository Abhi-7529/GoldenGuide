import type * as React from "react";

const GOLD = "#D9A441";
const GOLD_LIGHT = "#F2D48A";
const GOLD_DARK = "#B8860B";
const NAVY = "#182352";

const TICK_ANGLES = [
  0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5,
  315, 337.5,
];

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <g id="goldenguide-spike-primary">
          <path d="M50,50 L43.5,50 L50,13 Z" fill={GOLD_LIGHT} />
          <path d="M50,50 L56.5,50 L50,13 Z" fill={GOLD_DARK} />
        </g>
        <g id="goldenguide-spike-secondary">
          <path d="M50,50 L45.5,50 L50,25 Z" fill={GOLD_LIGHT} />
          <path d="M50,50 L54.5,50 L50,25 Z" fill={GOLD_DARK} />
        </g>
        <line
          id="goldenguide-tick"
          x1="50"
          y1="39"
          x2="50"
          y2="42"
          stroke={GOLD}
          strokeWidth="1.2"
        />
      </defs>

      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke={GOLD}
        strokeWidth="2"
      />

      {TICK_ANGLES.map((angle) => (
        <use
          key={angle}
          href="#goldenguide-tick"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      <circle cx="50" cy="50" r="39" fill={NAVY} />

      <use href="#goldenguide-spike-primary" transform="rotate(0 50 50)" />
      <use href="#goldenguide-spike-primary" transform="rotate(90 50 50)" />
      <use href="#goldenguide-spike-primary" transform="rotate(180 50 50)" />
      <use href="#goldenguide-spike-primary" transform="rotate(270 50 50)" />

      <use href="#goldenguide-spike-secondary" transform="rotate(45 50 50)" />
      <use href="#goldenguide-spike-secondary" transform="rotate(135 50 50)" />
      <use href="#goldenguide-spike-secondary" transform="rotate(225 50 50)" />
      <use href="#goldenguide-spike-secondary" transform="rotate(315 50 50)" />

      <circle
        cx="50"
        cy="50"
        r="12"
        fill={NAVY}
        stroke={GOLD}
        strokeWidth="1.5"
      />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="15"
        fill={GOLD_LIGHT}
      >
        G
      </text>

      <rect x="47.5" y="4" width="5" height="5" fill={GOLD} />
      <circle
        cx="50"
        cy="3"
        r="5"
        fill="none"
        stroke={GOLD}
        strokeWidth="2.2"
      />
    </svg>
  );
}
