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
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={label}>Purchase Status</div>

            <div className="mt-1 text-lg font-semibold text-white">
              Ready Check
            </div>
          </div>

          <span className={getStatusPill(storeLocked)}>
            {storeLocked ? "Closed" : "Open"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {[
            {
              title: "Store access",
              ok: !storeLocked,
              good: "Store is open",
              bad: "Store is closed",
            },
            {
              title: "PIN entered",
              ok: !!pin.trim(),
              good: "PIN ready",
              bad: "PIN required",
            },
            {
              title: "Student confirmed",
              ok: confirmOk,
              good: "Student ID matches",
              bad: "Confirm Student ID",
            },
            {
              title: "Enough XP",
              ok: hasEnoughPoints,
              good: "Can buy 1 point",
              bad: `Need ${xpPerPoint} XP`,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.025] px-3 py-3"
            >
              <div className="text-sm text-white/74">{item.title}</div>

              <div
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  item.ok
                    ? "border-emerald-400/18 bg-emerald-400/[0.09] text-emerald-100"
                    : "border-white/[0.05] bg-white/[0.035] text-white/60"
                }`}
              >
                {item.ok ? item.good : item.bad}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.04] bg-black/16 px-3 py-3 text-xs leading-5 text-white/56">
          {storeLocked
            ? "Store is currently locked."
            : !pin.trim()
            ? "Step 4: enter the Store PIN."
            : !confirmOk
            ? "Step 4: confirm your Student ID."
            : !hasEnoughPoints
            ? `You need ${xpPerPoint} XP to buy 1 stat point.`
            : pendingTarget
            ? "Step 6: review your upgrade and confirm the purchase."
            : "Step 5: choose a stat card below."}
        </div>
      </div>
    </div>
  );
}