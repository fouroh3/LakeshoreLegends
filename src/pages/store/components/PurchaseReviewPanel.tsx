import { btn, btnPrimary, innerCard, label, softPanel } from "../storeTheme";

type PendingMeta = {
  current: number;
  next: number;
  costXp: number;
  bal: number;
  afterBal: number;
  afterPoints: number;
  title: string;
  icon: string;
};

type Props = {
  pendingMeta: PendingMeta | null;
  pointsAvailable: number;
  canConfirmPurchase: boolean;
  spending: boolean;
  spendErr: string | null;
  toast: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  guildTheme: {
    border: string;
    pill: string;
    softPanel: string;
    cardGlow: string;
    text: string;
  };
};

export default function PurchaseReviewPanel({
  pendingMeta,
  pointsAvailable,
  canConfirmPurchase,
  spending,
  spendErr,
  toast,
  onCancel,
  onConfirm,
  guildTheme,
}: Props) {
  return (
    <div className={`${innerCard} px-4 py-4 sm:px-5`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className={label}>Upgrade Review</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-white">
            Confirm purchase
          </div>
        </div>
        {pendingMeta && (
          <div
            className={`rounded-full border px-3 py-1.5 text-xs ${guildTheme.pill}`}
          >
            {pendingMeta.icon} {pendingMeta.title}
          </div>
        )}
      </div>

      {!pendingMeta && (
        <div className="mt-4 rounded-[22px] border border-white/[0.04] bg-black/16 px-4 py-5 text-sm text-white/68">
          Choose an attribute above to see what will change.
        </div>
      )}

      {pendingMeta && (
        <div
          className={`${innerCard} ${guildTheme.border} ${guildTheme.softPanel} mt-4 px-4 py-4 ${guildTheme.cardGlow}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.04] text-base ${guildTheme.text}`}
              >
                {pendingMeta.icon}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-100">
                  +1 {pendingMeta.title}
                </div>
                <div className="text-xs text-white/52">
                  {pendingMeta.current} → {pendingMeta.next}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className={label}>Cost</div>
              <div className="text-base font-semibold tabular-nums text-white">
                {pendingMeta.costXp} XP
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className={`${softPanel} px-3 py-3 text-center`}>
              <div className={label}>XP now</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                {pendingMeta.bal}
              </div>
            </div>
            <div className={`${softPanel} px-3 py-3 text-center`}>
              <div className={label}>XP after</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                {pendingMeta.afterBal}
              </div>
            </div>
            <div className={`${softPanel} px-3 py-3 text-center`}>
              <div className={label}>Points now</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                {pointsAvailable}
              </div>
            </div>
            <div className={`${softPanel} px-3 py-3 text-center`}>
              <div className={label}>Points after</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                {pendingMeta.afterPoints}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              className={btn}
              type="button"
              onClick={onCancel}
              disabled={spending}
            >
              Cancel
            </button>
            <button
              className={canConfirmPurchase ? btnPrimary : btn}
              type="button"
              onClick={onConfirm}
              disabled={!canConfirmPurchase}
            >
              {spending ? "Purchasing…" : "Confirm Purchase"}
            </button>
          </div>
        </div>
      )}

      {spendErr && (
        <div className="mt-3 rounded-2xl border border-red-500/14 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {spendErr}
        </div>
      )}

      {toast && (
        <div className="mt-3 rounded-2xl border border-emerald-400/14 bg-emerald-400/[0.10] px-3 py-2 text-sm text-emerald-100">
          {toast}
        </div>
      )}
    </div>
  );
}
