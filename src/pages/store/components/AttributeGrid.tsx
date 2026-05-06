// src/pages/store/components/AttributeGrid.tsx

import type { AttrKey } from "../../../xpApi";
import { ATTRS, innerCard, label } from "../storeTheme";

type Props = {
  xpPerPoint: number;
  storeLocked: boolean;
  pin: string;
  confirmOk: boolean;
  hasEnoughPoints: boolean;
  canSelectAttribute: boolean;
  withinWindow: boolean;
  pendingTarget: AttrKey | null;
  setPendingTarget: (next: AttrKey | null) => void;
  displayAttr: (key: AttrKey) => number;
  guildTheme: {
    border: string;
    softPanel: string;
    cardGlow: string;
    text: string;
    accent: string;
  };
};

export default function AttributeGrid({
  xpPerPoint,
  storeLocked,
  pin,
  confirmOk,
  hasEnoughPoints,
  canSelectAttribute,
  withinWindow,
  pendingTarget,
  setPendingTarget,
  displayAttr,
  guildTheme,
}: Props) {
  const lockedReason = storeLocked
    ? "Store is closed."
    : !pin.trim()
    ? "Enter the Store PIN first."
    : !confirmOk
    ? "Confirm your Student ID first."
    : !hasEnoughPoints
    ? `You need ${xpPerPoint} XP to buy a point.`
    : !withinWindow
    ? "Spending is limited right now."
    : "";

  return (
    <div
      className={[
        innerCard,
        "px-4 py-4 sm:px-5",
        canSelectAttribute
          ? "border-cyan-300/15 bg-slate-950/70 shadow-[0_0_34px_rgba(34,211,238,0.06)]"
          : "bg-slate-950/40 opacity-90",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={`${label} flex items-center gap-2`}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                canSelectAttribute
                  ? "bg-cyan-400/20 text-cyan-200"
                  : "bg-white/10 text-white/40"
              }`}
            >
              5
            </span>

            <span className={!canSelectAttribute ? "text-white/45" : ""}>
              Choose an Attribute
            </span>
          </div>

          <div className="mt-1 text-xl font-semibold tracking-tight text-white">
            Pick one stat to upgrade
          </div>

          <div className="mt-1 text-sm text-white/56">
            Each purchase adds +1 permanently. Select a card to preview the upgrade.
          </div>
        </div>

        <div className="rounded-full border border-cyan-300/10 bg-cyan-400/[0.06] px-3 py-1.5 text-xs text-cyan-100">
          Cost: {xpPerPoint} XP per point
        </div>
      </div>

      {!canSelectAttribute && (
        <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100/90">
          {lockedReason || "Complete Step 4 before choosing an attribute."}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {ATTRS.map(({ key, title, icon, tint }) => {
          const current = displayAttr(key);
          const next = current + 1;
          const isSelected = pendingTarget === key;

          const cap = Math.max(5, next);
          const currentPct = Math.max(8, (current / cap) * 100);
          const nextPct = Math.max(10, (next / cap) * 100);

          return (
            <button
              key={key}
              type="button"
              className={[
                "group relative overflow-hidden rounded-[26px] border px-4 py-5 text-left transition-all duration-300",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
                isSelected
                  ? `${guildTheme.border} ${guildTheme.softPanel} ${guildTheme.cardGlow} scale-[1.02] shadow-[0_18px_36px_rgba(0,0,0,0.36)]`
                  : "border-white/[0.06] bg-[linear-gradient(180deg,rgba(24,29,41,0.86),rgba(10,13,20,0.92))] hover:-translate-y-[3px] hover:border-cyan-300/20 hover:bg-[linear-gradient(180deg,rgba(30,38,54,0.92),rgba(13,17,26,0.96))]",
                !canSelectAttribute ? "cursor-not-allowed opacity-55" : "",
              ].join(" ")}
              disabled={!canSelectAttribute}
              onClick={() => setPendingTarget(isSelected ? null : key)}
              title={
                canSelectAttribute
                  ? isSelected
                    ? `Selected ${title}`
                    : `Select ${title}`
                  : lockedReason || "Complete verification first"
              }
            >
              <div
                className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${tint}`}
              />

              {isSelected && (
                <div className="absolute right-3 top-3 rounded-full border border-cyan-300/20 bg-cyan-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">
                  Selected
                </div>
              )}

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-3xl">{icon}</div>

                    <div className="mt-3 text-lg font-semibold text-white">
                      {title}
                    </div>

                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/38">
                      {key}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">
                      Current
                    </div>

                    <div className="text-2xl font-black tabular-nums text-white">
                      {current}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-white/45">Preview</span>

                    <span className={isSelected ? guildTheme.text : "text-white/64"}>
                      {current} → {next}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-white/20"
                      style={{ width: `${currentPct}%` }}
                    />
                  </div>

                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className={`h-full rounded-full ${guildTheme.accent}`}
                      style={{ width: `${nextPct}%` }}
                    />
                  </div>
                </div>

                <div
                  className={[
                    "mt-5 rounded-2xl border px-3 py-2 text-center text-xs font-semibold transition",
                    isSelected
                      ? "border-cyan-300/20 bg-cyan-400/[0.10] text-cyan-100"
                      : "border-white/[0.05] bg-white/[0.035] text-white/58 group-hover:text-white",
                  ].join(" ")}
                >
                  {isSelected ? "Ready to review" : "Tap to choose"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}