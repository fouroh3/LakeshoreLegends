// src/pages/store/components/StoreSummaryPanel.tsx

import type { AttrKey } from "../../../xpApi";
import { innerCard, label } from "../storeTheme";

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
  pendingTarget: AttrKey | null;
  guildTheme: {
    border: string;
    softPanel: string;
    cardGlow: string;
    text: string;
    accent: string;
  };
};

export default function StoreSummaryPanel({
  xpPerPoint,
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
    <div
      className={[
        innerCard,
        guildTheme.border,
        guildTheme.softPanel,
        guildTheme.cardGlow,
        "px-3 py-3 xl:px-5 xl:py-5",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`${label} flex items-center gap-2`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300 text-[11px] font-black text-slate-950">
              4
            </span>

            Checkout
          </div>

          <div className="mt-1 text-lg font-semibold tracking-tight text-white xl:text-xl">
            Verify Purchase
          </div>
        </div>

        <div className="hidden rounded-full border border-white/[0.05] bg-white/[0.035] px-3 py-1 text-xs text-white/60 sm:block">
          {xpPerPoint} XP per upgrade
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-[120px_120px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/[0.05] bg-black/18 px-3 py-2">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">
            XP
          </div>

          <div className="mt-1 text-2xl font-black text-white">
            {summaryBalance ?? "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.05] bg-black/18 px-3 py-2">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">
            Points
          </div>

          <div className="mt-1 text-2xl font-black text-white">
            {summarySpendable ?? "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.05] bg-black/18 px-3 py-2">
          <div className={`${label} text-white/44`}>
            Store PIN
          </div>

          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            placeholder="Enter PIN"
            disabled={storeLocked}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.05] bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/30 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="rounded-2xl border border-white/[0.05] bg-black/18 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className={`${label} text-white/44`}>
              Student ID
            </div>

            <button
              type="button"
              onClick={() => setConfirmId(selectedStudentId)}
              disabled={storeLocked}
              className="rounded-full border border-cyan-300/12 bg-cyan-400/[0.08] px-2 py-0.5 text-[10px] font-medium text-cyan-100 transition hover:bg-cyan-400/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
            >
               Tap to Copy
            </button>
          </div>

          <input
            value={confirmId}
            onChange={(e) => setConfirmId(e.target.value)}
            placeholder={selectedStudentId}
            disabled={storeLocked}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.05] bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/30 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 ${
            storeLocked
              ? "bg-red-500/10 text-red-200"
              : "bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {storeLocked ? "Store Closed" : "Store Open"}
        </span>

        <span
          className={`rounded-full px-3 py-1 ${
            confirmOk
              ? "bg-emerald-500/10 text-emerald-200"
              : "bg-white/[0.05] text-white/46"
          }`}
        >
          {confirmOk ? "ID Verified" : "Awaiting ID"}
        </span>

        <span
          className={`rounded-full px-3 py-1 ${
            hasEnoughPoints
              ? "bg-emerald-500/10 text-emerald-200"
              : "bg-amber-500/10 text-amber-200"
          }`}
        >
          {hasEnoughPoints ? "Enough XP" : "Not Enough XP"}
        </span>

        {pendingTarget && (
          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-100">
            Ready to Purchase
          </span>
        )}
      </div>
    </div>
  );
}