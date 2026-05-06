// src/pages/store/components/StoreSummaryPanel.tsx

import {
  getStatusPill,
  innerCard,
  input,
  label,
  pill,
  softPanel,
} from "../storeTheme";

type Props = {
  xpPerPoint: number;
  maxPoints: number;
  summaryBalance: number | null;
  summarySpendable: number | null;
  pin: string;
  setPin: (v: string) => void;
  confirmId: string;
  setConfirmId: (v: string) => void;
  selectedStudentId: string;
  confirmOk: boolean;
  storeLocked: boolean;
  hasEnoughPoints: boolean;
  pendingTarget: string | null;
  guildTheme: {
    border: string;
    softPanel: string;
    text: string;
  };
};

export default function StoreSummaryPanel({
  xpPerPoint,
  maxPoints,
  summaryBalance,
  summarySpendable,
  pin,
  setPin,
  confirmId,
  setConfirmId,
  selectedStudentId,
  confirmOk,
  storeLocked,
  hasEnoughPoints,
  pendingTarget,
  guildTheme,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <div className={`${innerCard} px-4 py-4 sm:px-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`${label} flex items-center gap-2`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-[11px] font-black text-cyan-200">
                4
              </span>

              Verify Your Identity
            </div>

            <div className="mt-1 text-xl font-semibold tracking-tight text-white">
              Enter PIN + Student ID
            </div>

            <div className="mt-1 text-sm text-white/56">
              This protects your XP from being spent by someone else.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={pill}>
              <span className="text-white/42">Cost</span>
              <span className="font-semibold">{xpPerPoint} XP</span>
            </span>

            <span className={pill}>
              <span className="text-white/42">Limit</span>
              <span className="font-semibold">{maxPoints} max</span>
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            className={`${innerCard} ${guildTheme.border} ${guildTheme.softPanel} px-4 py-4 text-center`}
          >
            <div className={label}>XP Balance</div>

            <div className="mt-1 text-4xl font-bold tabular-nums text-white">
              {summaryBalance ?? "—"}
            </div>

            <div className="mt-1 text-xs text-white/44">
              Your XP after purchases will update here.
            </div>
          </div>

          <div
            className={`${innerCard} ${guildTheme.border} ${guildTheme.softPanel} px-4 py-4 text-center`}
          >
            <div className={label}>Points Available</div>

            <div className="mt-1 text-4xl font-bold tabular-nums text-white">
              {summarySpendable ?? "—"}
            </div>

            <div className="mt-1 text-xs text-white/44">
              1 point costs {xpPerPoint} XP.
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className={`${softPanel} px-4 py-4`}>
            <div className={`${label} flex items-center gap-2`}>
              <span className="text-cyan-200">A.</span>
              Enter Store PIN
            </div>

            <input
              className={`${input} mt-2`}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={
                storeLocked ? "Store is closed" : "Enter PIN from teacher"
              }
              disabled={storeLocked}
            />

            <div className="mt-2 text-[11px] text-white/52">
              {storeLocked
                ? "Store closed: XP can be viewed, but purchases are locked."
                : "Ask your teacher for the Store PIN before buying."}
            </div>
          </div>

          <div className={`${softPanel} px-4 py-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className={`${label} flex items-center gap-2`}>
                <span className="text-cyan-200">B.</span>
                Confirm Student ID
              </div>

              <button
                type="button"
                className={`text-[11px] transition ${guildTheme.text} hover:text-white disabled:cursor-not-allowed disabled:opacity-40`}
                onClick={() => setConfirmId(selectedStudentId)}
                disabled={storeLocked}
              >
                Tap to fill
              </button>
            </div>

            <input
              className={`${input} mt-2`}
              value={confirmId}
              onChange={(e) => setConfirmId(e.target.value)}
              placeholder={`Type: ${selectedStudentId}`}
              disabled={storeLocked}
            />

            <div className="mt-2 text-[11px]">
              {confirmOk ? (
                <span className={guildTheme.text}>✓ Student ID confirmed</span>
              ) : (
                <span className="text-white/52">
                  This must match before you can buy a stat point.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`${innerCard} px-4 py-4`}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={label}>Ready Check</div>

              <div className="mt-1 text-base font-semibold text-white">
                Store Status
              </div>
            </div>

            <span className={getStatusPill(storeLocked)}>
              {storeLocked ? "Closed" : "Open"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              {
                title: "PIN",
                ok: !!pin.trim(),
                good: "Ready",
                bad: "Needed",
              },
              {
                title: "ID",
                ok: confirmOk,
                good: "Verified",
                bad: "Check",
              },
              {
                title: "XP",
                ok: hasEnoughPoints,
                good: "Enough",
                bad: `Need ${xpPerPoint}`,
              },
              {
                title: "Next",
                ok: !!pendingTarget,
                good: "Review",
                bad: "Pick Stat",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                  {item.title}
                </div>

                <div
                  className={`mt-1 text-sm font-semibold ${
                    item.ok ? "text-emerald-100" : "text-white/50"
                  }`}
                >
                  {item.ok ? item.good : item.bad}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/[0.04] bg-black/14 px-3 py-2 text-xs leading-5 text-white/52">
            {storeLocked
              ? "Store is currently locked."
              : !pin.trim()
              ? "Enter the Store PIN."
              : !confirmOk
              ? "Confirm your Student ID."
              : !hasEnoughPoints
              ? `You need ${xpPerPoint} XP to buy 1 stat point.`
              : pendingTarget
              ? "Review and confirm your upgrade."
              : "Choose a stat card below."}
          </div>
        </div>
      </div>
    </div>
  );
}