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

          const cap = Math.max(5, next);
          const currentPct = Math.max(8, (current / cap) * 100);
          const nextPct = Math.max(10, (next / cap) * 100);

          return (
            <button
              key={key}
              type="button"
              className={[
                "group relative overflow-hidden rounded-[26px] border px-4 py-5 text-left transition-all duration-300",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
                isSelected
                  ? `${guildTheme.border} ${guildTheme.softPanel} ${guildTheme.cardGlow} scale-[1.02] shadow-[0_16px_32px_rgba(0,0,0,0.32)]`
                  : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:-translate-y-[3px] hover:border-white/[0.08] hover:bg-[linear-gradient(180deg,rgba(22,27,38,0.72),rgba(10,13,19,0.84))]",
                !canSelectAttribute ? "cursor-not-allowed opacity-75" : "",
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
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${tint} opacity-80`}
              />
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${guildTheme.accent}`}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-lg">
                    {icon}
                  </div>
                  <div className="text-base font-semibold text-white">
                    {title}
                  </div>
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-xs ${
                    isSelected
                      ? `${guildTheme.border} ${guildTheme.text} bg-white/[0.04]`
                      : "border-white/[0.05] bg-white/[0.03] text-white/50"
                  }`}
                >
                  +1
                </div>
              </div>

              <div className="mt-6 flex items-end justify-center gap-3">
                <span className="text-5xl font-bold text-white/80">
                  {current}
                </span>

                {isSelected && (
                  <>
                    <span className={`text-4xl ${guildTheme.text}`}>→</span>
                    <span className={`text-5xl font-bold ${guildTheme.text}`}>
                      {next}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-5">
                <div className="relative h-2.5 rounded-full bg-black/40 ring-1 ring-white/[0.05]">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-white/20"
                    style={{ width: `${currentPct}%` }}
                  />
                  {isSelected && (
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-cyan-400 transition-[width] duration-500"
                      style={{ width: `${nextPct}%` }}
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-white/46">
                  {isSelected ? "Upgrade preview active" : "Tap to preview"}
                </span>
                <span
                  className={isSelected ? guildTheme.text : "text-white/40"}
                >
                  {isSelected ? `${current} → ${next}` : `${current} current`}
                </span>
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
