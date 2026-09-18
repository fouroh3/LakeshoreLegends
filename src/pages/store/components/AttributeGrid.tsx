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
  pendingPoints: Partial<Record<AttrKey, number>>;
  onAdd: (key: AttrKey) => void;
  onRemove: (key: AttrKey) => void;
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
  pendingPoints,
  onAdd,
  onRemove,
  displayAttr,
  guildTheme,
}: Props) {
  return (
    <div
      className={[
        innerCard,
        "px-3 py-3 xl:px-5 xl:py-5 transition-all duration-500",

        canSelectAttribute
          ? [
              "border-cyan-300/20",
              "bg-[linear-gradient(180deg,rgba(10,18,30,0.96),rgba(6,10,18,0.98))]",
              "shadow-[0_0_44px_rgba(34,211,238,0.12)]",
              "ring-1 ring-cyan-300/10",
            ].join(" ")
          : ["bg-slate-950/40", "opacity-85"].join(" "),
      ].join(" ")}
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className={`${label} flex items-center gap-2`}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                canSelectAttribute
                  ? "bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.65)]"
                  : "bg-white/10 text-white/40"
              }`}
            >
              5
            </span>

            Pick Attribute
          </div>

          <div
            className={`mt-1 text-lg xl:text-xl font-semibold tracking-tight ${
              canSelectAttribute ? "text-cyan-100" : "text-white"
            }`}
          >
            {canSelectAttribute
              ? "Store unlocked — build your upgrade cart"
              : "Choose attributes to upgrade"}
          </div>

          <div
            className={`mt-1 text-xs xl:text-sm ${
              canSelectAttribute ? "text-cyan-100/70" : "text-white/56"
            }`}
          >
            {canSelectAttribute
              ? "Use + and − to set each upgrade amount, then confirm once."
              : "The number between − and + shows how many upgrades are in your cart."}
          </div>
        </div>

        <div className="self-start rounded-full border border-white/[0.05] bg-white/[0.035] px-3 py-1 text-[11px] text-white/60">
          Cost: {xpPerPoint} XP
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 xl:mt-5 xl:gap-3 xl:grid-cols-3">
        {ATTRS.map(({ key, title, icon, tint }) => {
          const current = displayAttr(key);
          const quantity = Number(pendingPoints[key] || 0);
          const next = current + quantity;
          const isSelected = quantity > 0;

          const cap = Math.max(5, next);
          const currentPct = Math.max(8, (current / cap) * 100);
          const nextPct = Math.max(10, (next / cap) * 100);

          return (
            <div
              key={key}
              className={[
                "group relative overflow-hidden rounded-[20px] xl:rounded-[24px] border px-3 py-3 xl:px-4 xl:py-4 text-left transition-all duration-300",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",

                isSelected
                  ? "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(17,83,96,0.58),rgba(6,25,34,0.96))] ring-2 ring-cyan-300/30 scale-[1.018] shadow-[0_0_32px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:border-white/[0.10] hover:bg-white/[0.045]",

                !canSelectAttribute ? "cursor-not-allowed opacity-75" : "",
              ].join(" ")}
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-16 xl:h-20 bg-gradient-to-b ${tint} opacity-80`}
              />

              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${
                  isSelected ? "from-transparent via-cyan-200 to-transparent" : guildTheme.accent
                }`}
              />

              <div className="relative flex items-center gap-2">
                <div className="shrink-0 text-lg xl:text-2xl leading-none">
                  {icon}
                </div>

                <div className="min-w-0 flex-1 text-xs xl:text-[13px] font-semibold leading-tight text-white">
                  {title}
                </div>
              </div>

              <div className="mt-4 xl:mt-5 flex items-end justify-center gap-2">
                <span className="text-3xl xl:text-4xl font-bold text-white/80">
                  {current}
                </span>

                {isSelected && (
                  <>
                    <span className={`text-2xl xl:text-3xl ${guildTheme.text}`}>
                      →
                    </span>

                    <span
                      className={`text-3xl xl:text-4xl font-bold ${guildTheme.text}`}
                    >
                      {next}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 xl:mt-4">
                <div className="relative h-2 rounded-full bg-black/40 ring-1 ring-white/[0.05]">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-white/20"
                    style={{ width: `${currentPct}%` }}
                  />

                  {isSelected && (
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full ${guildTheme.accent} shadow-[0_0_16px_rgba(34,211,238,0.45)] transition-[width] duration-500`}
                      style={{ width: `${nextPct}%` }}
                    />
                  )}
                </div>
              </div>

              <div className="mt-3 grid h-10 grid-cols-[2.25rem_minmax(2rem,1fr)_2.25rem] items-center gap-1.5 xl:mt-4 xl:h-11">
                <button
                  type="button"
                  disabled={!isSelected}
                  onClick={() => onRemove(key)}
                  className="h-full rounded-xl border border-white/10 bg-white/[0.04] text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-25"
                  aria-label={`Remove one ${title} upgrade`}
                >
                  −
                </button>
                <div
                  className="flex h-full min-w-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-400/[0.08] text-base font-black tabular-nums text-cyan-100"
                  aria-live="polite"
                  aria-label={`${quantity} ${title} upgrade${quantity === 1 ? "" : "s"} in cart`}
                >
                  {quantity ? `+${quantity}` : "0"}
                </div>
                <button
                  type="button"
                  disabled={!canSelectAttribute}
                  onClick={() => onAdd(key)}
                  className="h-full rounded-xl bg-cyan-300 text-lg font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Add one ${title} upgrade`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 xl:mt-4 text-[11px] xl:text-xs text-white/52">
        {storeLocked
          ? "Store is closed."
          : !pin.trim()
          ? "Enter the Store PIN to unlock selection."
          : !confirmOk
          ? "Confirm your legend ID to unlock selection."
          : !hasEnoughPoints
          ? `Not enough XP. You need ${xpPerPoint} XP for 1 point.`
          : !withinWindow
          ? "Purchases are limited right now."
          : Object.keys(pendingPoints).length
          ? "Review the combined cart and confirm once."
          : "Add attribute points to your cart."}
      </div>
    </div>
  );
}
