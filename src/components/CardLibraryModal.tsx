import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { InventoryCard } from "../types/inventory";
import { isRareCard, rareCardBadgeClass } from "../utils/rareCards";

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
    <section className="rounded-[22px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(22,24,32,0.88),rgba(8,10,16,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-5">
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
  const scrollYRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartScrollTopRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const scrollY = window.scrollY;
    scrollYRef.current = scrollY;

    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;

    window.addEventListener("keydown", onKeyDown);

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;

      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.body.style.touchAction = prevBodyTouchAction;

      window.scrollTo(0, scrollYRef.current);
    };
  }, [open, onClose]);

  if (!open || !card) return null;

  const typeKey = String(card.type ?? "other").toLowerCase();
  const badgeClass = TYPE_STYLES[typeKey] ?? TYPE_STYLES.other;
  const rare = isRareCard(card);
  const showChainHook =
    card.loreChain === "lake" ||
    card.loreChain === "prism" ||
    card.loreChain === "alchemist";

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 640) return;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartScrollTopRef.current = scrollerRef.current?.scrollTop ?? 0;
    setDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 640) return;
    if (touchStartYRef.current == null) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartYRef.current;
    const scrollTop = scrollerRef.current?.scrollTop ?? 0;

    if (touchStartScrollTopRef.current <= 0 && scrollTop <= 0 && delta > 0) {
      setDragging(true);
      setDragOffset(Math.min(delta, 140));
    }
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 640) {
      touchStartYRef.current = null;
      setDragging(false);
      setDragOffset(0);
      return;
    }

    if (dragOffset > 90) {
      onClose();
    }

    touchStartYRef.current = null;
    setDragging(false);
    setDragOffset(0);
  };

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 overflow-y-auto overscroll-contain px-0 py-0 sm:px-4 sm:py-4"
        onClick={onClose}
      >
        <div className="relative min-h-[100dvh] w-full sm:flex sm:min-h-full sm:items-center sm:justify-center">
          <div
            className={`relative mx-auto w-full max-w-5xl min-h-[100dvh] overflow-hidden rounded-none border bg-[linear-gradient(180deg,rgba(10,14,24,0.985),rgba(6,9,16,0.985))] shadow-[0_30px_100px_rgba(0,0,0,0.62)] sm:my-6 sm:min-h-0 sm:rounded-[30px] ${
              rare
                ? "border-red-500/30 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.14),transparent_26%),radial-gradient(circle_at_12%_0%,rgba(245,158,11,0.10),transparent_22%)]"
                : "border-zinc-700/80 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.07),transparent_30%),radial-gradient(circle_at_12%_0%,rgba(245,158,11,0.08),transparent_22%)]"
            }`}
            style={{
              transform:
                dragging && dragOffset > 0
                  ? `translateY(${dragOffset}px) scale(${1 - dragOffset / 1800})`
                  : "translateY(0) scale(1)",
              transition: dragging ? "none" : "transform 180ms ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-between border-b border-zinc-800/80 px-4 py-4 sm:px-6 sm:py-5">
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-px ${
                  rare
                    ? "bg-[linear-gradient(90deg,transparent,rgba(239,68,68,0.38),transparent)]"
                    : "bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.35),transparent)]"
                }`}
              />

              <div className="pointer-events-none absolute left-1/2 top-1.5 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/12 sm:hidden" />

              <div className="min-w-0 pr-3">
                <div
                  className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
                    rare ? "text-red-200/60" : "text-cyan-200/55"
                  }`}
                >
                  Arcane Archive
                </div>

                <h2 className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl">
                  {card.name}
                </h2>

                {card.whisper ? (
                  <p
                    className={`mt-2 text-[13px] italic tracking-[0.01em] ${
                      rare ? "text-red-100/78" : "text-cyan-100/72"
                    }`}
                    style={{
                      textShadow: rare
                        ? "0 0 10px rgba(239,68,68,0.10)"
                        : "0 0 10px rgba(34,211,238,0.08)",
                    }}
                  >
                    {card.whisper}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-zinc-700/80 bg-zinc-900/85 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 transition hover:border-cyan-300/30 hover:bg-zinc-800 hover:text-white"
              >
                Close
              </button>
            </div>

            <div
              ref={scrollerRef}
              className="h-[calc(100dvh-84px)] overflow-y-auto overscroll-contain sm:h-auto sm:max-h-[calc(92dvh-84px)]"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="grid gap-4 p-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:gap-5 sm:p-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
                <div
                  className={`relative overflow-hidden rounded-[26px] border p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:self-start ${
                    rare
                      ? "border-red-500/20 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),transparent_52%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.08),transparent_40%),linear-gradient(180deg,rgba(26,16,20,0.96),rgba(10,8,14,0.98))]"
                      : "border-zinc-800/80 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_55%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.08),transparent_40%),linear-gradient(180deg,rgba(18,23,34,0.96),rgba(8,10,16,0.98))]"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />
                  <div
                    className={`pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl ${
                      rare ? "bg-red-400/12" : "bg-cyan-400/10"
                    }`}
                  />

                  <div className="relative overflow-hidden rounded-[24px] border border-zinc-700/80 bg-[linear-gradient(180deg,rgba(6,8,14,0.96),rgba(3,4,8,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.28)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%)]" />

                    <div className="relative mx-auto aspect-[3/4.2] w-full max-w-[260px] sm:max-w-[280px] lg:max-w-[300px]">
                      {card.imageUrl ? (
                        <>
                          <div className="absolute inset-0 rounded-[18px] border border-white/10 bg-black/40 shadow-inner" />
                          <div className="absolute inset-x-[8.5%] inset-y-[6.5%] overflow-hidden rounded-[12px] bg-black">
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              className="h-full w-full object-contain object-center"
                            />
                          </div>
                        </>
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

                    {rare ? (
                      <span
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${rareCardBadgeClass()}`}
                      >
                        Rare
                      </span>
                    ) : null}

                    {card.isConsumed ? (
                      <span className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100/85">
                        Consumable
                      </span>
                    ) : null}

                    {typeof card.quantity === "number" ? (
                      <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">
                        Qty {card.quantity}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <ModalSection title="Effect">
                    <div className="text-white/92">
                      {card.effect ||
                        "No effect text has been added for this card yet."}
                    </div>
                  </ModalSection>

                  {card.lore ? (
                    <section className="rounded-[22px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(18,20,28,0.92),rgba(8,10,16,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-5">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                        Lore
                      </div>

                      <div className="text-[15px] leading-7 text-white/74">
                        {card.lore}
                      </div>

                      {showChainHook ? (
                        <div
                          className={`mt-4 border-t pt-3 text-[11px] uppercase tracking-[0.18em] ${
                            rare
                              ? "border-red-500/15 text-red-200/42"
                              : "border-cyan-500/12 text-cyan-200/38"
                          }`}
                        >
                          Part of something larger.
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {card.useText ? (
                    <ModalSection title="Use">{card.useText}</ModalSection>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <ModalSection title="Card Type">
                      {rare
                        ? `Rare ${typeLabel(card.type)}`
                        : typeLabel(card.type)}
                    </ModalSection>

                    <ModalSection title="Inventory Presence">
                      <div className="flex items-end gap-2">
                        <div className="text-3xl font-semibold leading-none text-white">
                          {inventoryCount}
                        </div>
                        <div
                          className={`pb-1 text-[11px] uppercase tracking-[0.16em] ${
                            rare ? "text-red-200/55" : "text-cyan-200/55"
                          }`}
                        >
                          holders
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-white/62">
                        player{inventoryCount === 1 ? "" : "s"} currently have
                        this card in their inventory
                      </div>
                    </ModalSection>
                  </div>

                  {card.source ? (
                    <section className="rounded-[22px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(16,18,24,0.90),rgba(7,9,14,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-5">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                        Discovered In
                      </div>
                      <div className="text-sm leading-6 text-white/84">
                        {card.source}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
