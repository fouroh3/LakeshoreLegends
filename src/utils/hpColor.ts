// src/utils/hpColor.ts

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Smooth HP colour scale (red → amber → green) based on HP% (0..1).
 * Uses HSL hue interpolation for a continuous gradient feel across students.
 */
export function hpBarColorFromPct(pctRaw: number) {
  const pct = clamp01(pctRaw);

  // piecewise hue: 0→0.5 maps 0°→45°, 0.5→1 maps 45°→135°
  const hue = pct <= 0.5 ? 0 + (pct / 0.5) * 45 : 45 + ((pct - 0.5) / 0.5) * 90;

  const sat = 85; // tweak if you want softer/harder
  const lit = 52;
  return `hsl(${hue} ${sat}% ${lit}%)`;
}
