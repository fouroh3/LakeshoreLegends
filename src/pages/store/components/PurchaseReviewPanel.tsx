// src/pages/store/components/PurchaseReviewPanel.tsx

import type { AttrKey } from "../../../xpApi";
import { ATTRS, innerCard, label } from "../storeTheme";

type Props = {
  pendingTarget: AttrKey | null;
  lastPurchased: AttrKey | null;
  displayAttr: (key: AttrKey) => number;
  xpPerPoint: number;
  summaryBalance: number | null;
  canConfirm: boolean;
  spending: boolean;
  onConfirm: () => void;
  guildTheme: {
    border: string;
    softPanel: string;
    cardGlow: string;
    text: string;
    accent: string;
  };
};

export default function PurchaseReviewPanel({
  pendingTarget,
  lastPurchased,
  displayAttr,
  xpPerPoint,
  summaryBalance,
  canConfirm,
  spending,
  onConfirm,
  guildTheme,
}: Props) {
  const attr = ATTRS.find((x) => x.key === pendingTarget);

  if (!attr) {
    return (
      <div className={`${innerCard} px-3 py-3 xl:px-5 xl:py-5`}>
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-black text-white/40">
            6
          </span>

          <div>
            <div className={`${label} text-white/38`}>Purchase Review</div>

            <div className="mt-1 text-base font-semibold text-white">
              Choose a stat card to continue
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.04] bg-black/16 px-4 py-3 text-sm text-white/54">
          Your selected upgrade will appear here before purchase.
        </div>
      </div>
    );
  }

  const current = displayAttr(attr.key);
  const next = current + 1;
  const remaining =
    summaryBalance == null ? null : summaryBalance - xpPerPoint;
  const wasJustPurchased = lastPurchased === attr.key;

  return (
    <div
      className={[
        innerCard,
        guildTheme.border,
        guildTheme.softPanel,
        guildTheme.cardGlow,
        "self-start px-5 py-5 xl:sticky xl:top-24",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className={`${label} flex items-center gap-2`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-[11px] font-black text-cyan-200">
              6
            </span>

            Purchase Review
          </div>

          <div className="mt-1 text-xl font-semibold tracking-tight text-white">
            Buy {attr.title}
          </div>

          <div className="mt-1 text-sm text-white/56">
            Review your upgrade before spending XP.
          </div>
        </div>

        <div className="rounded-full border border-cyan-300/10 bg-cyan-400/[0.08] px-3 py-1.5 text-xs text-cyan-100">
          Permanent
        </div>
      </div>

      <div className="mt-4">
        <div
          className={[
            "relative overflow-hidden rounded-[26px] border px-5 py-5",
            guildTheme.border,
            wasJustPurchased
              ? "bg-[linear-gradient(180deg,rgba(6,78,59,0.55),rgba(10,14,22,0.96))] ring-1 ring-emerald-300/20"
              : "bg-[linear-gradient(180deg,rgba(20,27,38,0.88),rgba(10,14,22,0.96))]",
          ].join(" ")}
        >
          <div
            className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${attr.tint} opacity-80`}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-xl">
                  {attr.icon}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold text-white">
                    {attr.title}
                  </div>

                  <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/38">
                    {attr.key}
                  </div>
                </div>
              </div>

              <div
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  wasJustPurchased
                    ? "border-emerald-300/20 bg-emerald-400/[0.12] text-emerald-100"
                    : "border-cyan-300/15 bg-cyan-400/[0.10] text-cyan-100",
                ].join(" ")}
              >
                {wasJustPurchased ? "Purchased" : "+1 Upgrade"}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">
                  Current
                </div>

                <div className="mt-1 text-5xl font-black text-white/82">
                  {current}
                </div>
              </div>

              <div className={`text-4xl ${guildTheme.text}`}>→</div>

              <div className="text-center">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">
                  After
                </div>

                <div className={`mt-1 text-5xl font-black ${guildTheme.text}`}>
                  {next}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/54">XP Cost</span>

                <span className="font-semibold text-white">
                  {xpPerPoint} XP
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/54">XP Remaining</span>

                <span
                  className={
                    remaining != null && remaining >= 0
                      ? "font-semibold text-emerald-200"
                      : "font-semibold text-red-200"
                  }
                >
                  {remaining ?? "—"}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.05] bg-black/18 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">🔒</div>

                <div>
                  <div className="text-sm font-semibold text-white">
                    This upgrade is permanent
                  </div>

                  <div className="mt-1 text-xs leading-5 text-white/52">
                    Purchased stat upgrades cannot be refunded or reversed.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canConfirm || spending || wasJustPurchased}
              onClick={onConfirm}
              className={[
                "mt-5 w-full rounded-[24px] px-5 py-4 text-[17px] font-semibold tracking-tight transition-all duration-200",
                wasJustPurchased
                  ? "border border-emerald-300/20 bg-emerald-400/[0.14] text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.16)]"
                  : canConfirm && !spending
                  ? "bg-[linear-gradient(180deg,#37d7f6,#22c7ee)] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)] hover:scale-[1.02]"
                  : "cursor-not-allowed border border-white/[0.05] bg-white/[0.04] text-white/34",
              ].join(" ")}
            >
              {wasJustPurchased
                ? `Purchased — ${attr.title} upgraded`
                : spending
                ? "Processing Purchase..."
                : canConfirm
                ? `Buy +1 ${attr.title} (${xpPerPoint} XP)`
                : "Verification Required"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}