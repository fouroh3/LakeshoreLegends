import { useEffect } from "react";
import type { ReactNode } from "react";
import type { InventoryCard } from "../data/itemLibrary";

type Props = {
  card: InventoryCard | null;
  open: boolean;
  onClose: () => void;
  inventoryCount?: number;
};

const TYPE_STYLES: Record<string, string> = {
  relic:
    "border-amber-300/25 bg-amber-500/12 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.12)]",
  potion:
    "border-emerald-300/25 bg-emerald-500/12 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.12)]",
  item: "border-cyan-300/25 bg-cyan-500/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
  pet: "border-violet-300/25 bg-violet-500/12 text-violet-100 shadow-[0_0_18px_rgba(168,85,247,0.12)]",
  other:
    "border-white/15 bg-white/10 text-white/85 shadow-[0_0_18px_rgba(255,255,255,0.06)]",
};

function typeLabel(type?: string) {
  const value = String(type ?? "other")
    .trim()
    .toLowerCase();
  if (!value) return "Other";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ModalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        {title}
      </div>
      <div className="text-sm leading-6 text-white/88">{children}</div>
    </section>
  );
}

export default function CardLibraryModal({
  card,
  open,
  onClose,
  inventoryCount = 0,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !card) return null;

  const typeKey = String(card.type ?? "other").toLowerCase();
  const badgeClass = TYPE_STYLES[typeKey] ?? TYPE_STYLES.other;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-md sm:px-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(11,16,28,0.98),rgba(7,10,18,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/45">
              Card Library
            </div>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {card.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/[0.09] hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-76px)] overflow-y-auto">
          <div className="grid gap-4 p-4 sm:gap-5 sm:p-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="aspect-[3/4] w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_52%),linear-gradient(180deg,rgba(18,28,48,0.96),rgba(7,12,22,0.98))]">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/35">
                      No card art available
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={[
                    "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    badgeClass,
                  ].join(" ")}
                >
                  {typeLabel(card.type)}
                </span>

                {card.isEquipped && (
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/85">
                    Equipped
                  </span>
                )}

                {card.isConsumed && (
                  <span className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100/85">
                    Consumable
                  </span>
                )}

                {typeof card.quantity === "number" && (
                  <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">
                    Qty {card.quantity}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <ModalSection title="Effect">
                {card.effect ||
                  "No effect text has been added for this card yet."}
              </ModalSection>

              {card.useText ? (
                <ModalSection title="Use">{card.useText}</ModalSection>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <ModalSection title="Card Type">
                  {typeLabel(card.type)}
                </ModalSection>

                <ModalSection title="Inventory Presence">
                  <div className="text-2xl font-semibold text-white">
                    {inventoryCount}
                  </div>
                  <div className="mt-1 text-sm text-white/62">
                    player{inventoryCount === 1 ? "" : "s"} currently have this
                    card in their inventory
                  </div>
                </ModalSection>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
