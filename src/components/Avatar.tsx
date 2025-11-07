import React, { useMemo } from "react";

export type AvatarBadge = string | React.ReactNode;

function hashSeed(input: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hsl(seed: number, s = 55, l = 22) {
  const hue = seed % 360;
  return `hsl(${hue} ${s}% ${l}%)`;
}

export default function Avatar({
  name,
  src,
  size = 64,
  badge,
  className = "",
}: {
  name: string;
  src?: string;
  size?: number;
  badge?: AvatarBadge;
  className?: string;
}) {
  const seed = useMemo(() => hashSeed(name || "Legend"), [name]);
  const a = (seed & 0xff) / 255;
  const b = ((seed >> 8) & 0xff) / 255;

  const bg = useMemo(() => {
    const c1 = hsl(seed, 60, 18);
    const c2 = hsl(seed + 137, 65, 26);
    return `radial-gradient(circle at ${a * 100}% ${
      b * 100
    }%, ${c1} 0%, ${c2} 100%)`;
  }, [seed, a, b]);

  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2) || "LL";

  return (
    // OUTER: no overflow so the badge can hang outside the corner
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {/* INNER: masked box with rounded corners; this one clips the image/gradient */}
      <div
        className="absolute inset-0 rounded-2xl border border-zinc-800 overflow-hidden"
        style={{ background: bg }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover opacity-85 mix-blend-luminosity"
            draggable={false}
          />
        ) : null}

        {/* initials */}
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-zinc-50/95 font-semibold tracking-wide select-none text-base">
            {initials}
          </span>
        </div>
      </div>

      {/* corner-overlap badge (sits OUTSIDE the masked box) */}
      {badge ? (
        <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 z-10 pointer-events-none">
          <div className="pointer-events-auto rounded-full bg-zinc-900/90 border border-zinc-700 shadow-md ring-2 ring-zinc-900 px-1.5 py-0.5 text-sm">
            {typeof badge === "string" ? <span>{badge}</span> : badge}
          </div>
        </div>
      ) : null}
    </div>
  );
}
