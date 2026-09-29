import { useMemo } from "react";

export interface ChartPoint {
  t: number; // epoch ms
  v: number; // °C
}

export interface TemperatureChartProps {
  points: ChartPoint[];
  /** Safe band to shade, if a threshold policy is known. */
  band?: { min: number; max: number } | undefined;
  /** Accessible summary for screen readers (the chart itself is role="img"). */
  ariaSummary: string;
}

const W = 640;
const H = 220;
const PAD = { top: 12, right: 16, bottom: 24, left: 36 };

/**
 * A dependency-free, theme-aware line chart for temperature over time. Colours come from design
 * tokens (CSS custom properties), so it flips with light/dark automatically. It is static (no
 * animation), so `prefers-reduced-motion` needs no special handling. Exposed as a single role="img"
 * with a text summary for assistive tech.
 */
export function TemperatureChart({ points, band, ariaSummary }: TemperatureChartProps) {
  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const times = points.map((p) => p.t);
    const values = points.map((p) => p.v);
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    let vMin = Math.min(...values, band?.min ?? Infinity);
    let vMax = Math.max(...values, band?.max ?? -Infinity);
    if (!Number.isFinite(vMin) || !Number.isFinite(vMax)) {
      vMin = Math.min(...values);
      vMax = Math.max(...values);
    }
    const vPad = (vMax - vMin || 1) * 0.15;
    vMin -= vPad;
    vMax += vPad;

    const x = (t: number): number =>
      tMax === tMin
        ? PAD.left + (W - PAD.left - PAD.right) / 2
        : PAD.left + ((t - tMin) / (tMax - tMin)) * (W - PAD.left - PAD.right);
    const y = (v: number): number =>
      PAD.top + (1 - (v - vMin) / (vMax - vMin || 1)) * (H - PAD.top - PAD.bottom);

    const path = points
      .map((p, index) => `${index === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`)
      .join(" ");
    const last = points[points.length - 1];

    return { x, y, path, vMin, vMax, tMin, tMax, last };
  }, [points, band]);

  if (geometry === null) return null;

  const { x, y, path, vMin, vMax, tMin, tMax, last } = geometry;

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaSummary}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>Temperature over time</title>
      <desc>{ariaSummary}</desc>

      {/* Safe band */}
      {band !== undefined && (
        <rect
          x={PAD.left}
          y={y(band.max)}
          width={W - PAD.left - PAD.right}
          height={Math.max(0, y(band.min) - y(band.max))}
          fill="var(--color-success)"
          opacity={0.12}
        />
      )}

      {/* Axes */}
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="var(--color-border)"
      />
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={H - PAD.bottom}
        stroke="var(--color-border)"
      />

      {/* Y labels (min / max) */}
      <text x={4} y={y(vMax) + 4} fontSize={10} fill="var(--color-text-subtle)">
        {vMax.toFixed(1)}
      </text>
      <text x={4} y={y(vMin) + 4} fontSize={10} fill="var(--color-text-subtle)">
        {vMin.toFixed(1)}
      </text>

      {/* X labels (first / last time) */}
      <text x={PAD.left} y={H - 8} fontSize={10} fill="var(--color-text-subtle)">
        {new Date(tMin).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </text>
      <text
        x={W - PAD.right}
        y={H - 8}
        fontSize={10}
        textAnchor="end"
        fill="var(--color-text-subtle)"
      >
        {new Date(tMax).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </text>

      {/* Series */}
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {last !== undefined && (
        <circle cx={x(last.t)} cy={y(last.v)} r={3.5} fill="var(--color-accent)" />
      )}
    </svg>
  );
}
