import type { AttrKey } from "../../../xpApi";
import { ATTRS, innerCard, label } from "../storeTheme";

type Props = {
  pendingPoints: Partial<Record<AttrKey, number>>;
  lastPurchaseCount: number;
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
  pendingPoints,
  lastPurchaseCount,
  displayAttr,
  xpPerPoint,
  summaryBalance,
  canConfirm,
  spending,
  onConfirm,
  guildTheme,
}: Props) {
  const selected = ATTRS.map((attribute) => ({
    ...attribute,
    points: Number(pendingPoints[attribute.key] || 0),
  })).filter((attribute) => attribute.points > 0);
  const totalPoints = selected.reduce((sum, attribute) => sum + attribute.points, 0);
  const totalCost = totalPoints * xpPerPoint;
  const remaining = summaryBalance == null ? null : summaryBalance - totalCost;
  const wasJustPurchased = lastPurchaseCount > 0;

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
      <div className={`${label} flex items-center gap-2`}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-[11px] font-black text-cyan-200">
          6
        </span>
        Purchase Review
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-white">
        {selected.length ? "Your upgrade cart" : "Build your upgrade cart"}
      </div>
      <div className="mt-1 text-sm text-white/56">
        Multiple attributes are processed together as one purchase.
      </div>

      <div className="mt-4 space-y-2">
        {selected.length === 0 && (
          <div className="rounded-2xl border border-white/[0.05] bg-black/18 px-4 py-5 text-center text-sm text-white/52">
            Use the + buttons to add attribute points.
          </div>
        )}
        {selected.map((attribute) => {
          const current = displayAttr(attribute.key);
          return (
            <div
              key={attribute.key}
              className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{attribute.icon}</span>
                <div>
                  <div className="font-semibold text-white">{attribute.title}</div>
                  <div className="text-xs text-white/45">{attribute.key}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-black ${guildTheme.text}`}>
                  {current} → {current + attribute.points}
                </div>
                <div className="text-xs text-white/45">+{attribute.points}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-white/54">Upgrades</span>
          <span className="font-semibold text-white">{totalPoints}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-white/54">Total XP</span>
          <span className="font-semibold text-white">{totalCost}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-white/54">XP Remaining</span>
          <span className={remaining != null && remaining >= 0 ? "font-semibold text-emerald-200" : "font-semibold text-red-200"}>
            {remaining ?? "—"}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={!canConfirm || spending || wasJustPurchased}
        onClick={onConfirm}
        className={[
          "mt-5 w-full rounded-[24px] px-5 py-4 text-[17px] font-semibold tracking-tight transition-all duration-200",
          wasJustPurchased
            ? "border border-emerald-300/20 bg-emerald-400/[0.14] text-emerald-100"
            : canConfirm && !spending
            ? "bg-[linear-gradient(180deg,#37d7f6,#22c7ee)] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)] hover:scale-[1.02]"
            : "cursor-not-allowed border border-white/[0.05] bg-white/[0.04] text-white/34",
        ].join(" ")}
      >
        {wasJustPurchased
          ? `${lastPurchaseCount} upgrade${lastPurchaseCount === 1 ? "" : "s"} purchased`
          : spending
          ? "Processing one secure purchase..."
          : canConfirm
          ? `Buy ${totalPoints} upgrade${totalPoints === 1 ? "" : "s"} (${totalCost} XP)`
          : "Verification Required"}
      </button>
    </div>
  );
}
