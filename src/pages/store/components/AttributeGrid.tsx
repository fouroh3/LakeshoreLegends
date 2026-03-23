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
  return (
    <div className={`${innerCard} px-4 py-4 sm:px-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={label}>Upgrade Preview</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-white">
            Select an attribute
          </div>
          <div className="mt-1 text-sm text-white/56">
            Choose one core stat to preview a +1 upgrade.
          </div>
        </div>
        <div className="rounded-full border border-white/[0.05] bg-white/[0.035] px-3 py-1.5 text-xs text-white/60">
          Cost: {xpPerPoint} XP
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {ATTRS.map(({ key, title, icon, tint }) => {
          const current = displayAttr(key);
          const next = current + 1;
          const isSelected = pendingTarget === key;

          return (
            <button
              key={key}
              className={[
                "group relative overflow-hidden rounded-[24px] border px-3 py-4 text-left transition-all duration-300",
                isSelected
                  ? `${guildTheme.border} ${guildTheme.softPanel} ${guildTheme.cardGlow} -translate-y-[2px] shadow-[0_12px_26px_rgba(0,0,0,0.26)]`
                  : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:-translate-y-[3px] hover:border-white/[0.07] hover:bg-[linear-gradient(180deg,rgba(22,27,38,0.72),rgba(10,13,19,0.84))] hover:shadow-[0_14px_28px_rgba(0,0,0,0.30),0_0_18px_rgba(34,211,238,0.04)]",
              ].join(" ")}
              disabled={!canSelectAttribute}
              onClick={() => setPendingTarget(isSelected ? null : key)}
              title={
                canSelectAttribute
                  ? isSelected
                    ? "Selected (tap again to unselect)"
                    : `Select ${title}`
                  : "Need store open + PIN + confirm + enough XP"
              }
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${tint}`}
              />
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${guildTheme.accent}`}
              />

              <div className="relative flex items-center justify-between gap-2">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.04] text-base shadow-[0_4px_12px_rgba(0,0,0,0.18)] ${
                    isSelected ? guildTheme.text : ""
                  }`}
                >
                  {icon}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                    isSelected
                      ? guildTheme.border +
                        " " +
                        guildTheme.text +
                        " bg-white/[0.03]"
                      : "border-white/[0.05] bg-white/[0.03] text-white/48"
                  }`}
                >
                  +1
                </span>
              </div>

              <div className="relative mt-3 text-[14px] font-semibold leading-tight text-white sm:text-[15px]">
                {title}
              </div>

              <div className="relative mt-3 min-h-[52px] flex items-center justify-center">
                {!isSelected ? (
                  <div className="text-3xl font-bold tabular-nums leading-none text-zinc-100 sm:text-4xl">
                    {current}
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center gap-2 tabular-nums sm:gap-3">
                    <span className="text-xl font-semibold text-white/50 sm:text-2xl">
                      {current}
                    </span>
                    <span className={`text-xl sm:text-2xl ${guildTheme.text}`}>
                      →
                    </span>
                    <span
                      className={`text-3xl font-bold leading-none sm:text-4xl ${guildTheme.text}`}
                    >
                      {next}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative mt-2 h-1.5 rounded-full bg-black/40 ring-1 ring-white/[0.04]">
                <div
                  className={`h-full rounded-full ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-300"
                      : "bg-gradient-to-r from-white/40 to-white/18"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(14, (current / 10) * 100)
                    )}%`,
                  }}
                />
              </div>

              <div className="relative mt-3 text-[11px] text-white/48">
                {isSelected ? "Selected for confirmation" : "Tap to preview"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-white/52">
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
          : pendingTarget
          ? "Great — now review and confirm below."
          : "Select an attribute to preview the purchase."}
      </div>
    </div>
  );
}
