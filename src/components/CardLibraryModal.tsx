import type { InventoryCard } from "../data/itemLibrary";

type Props = {
  card: InventoryCard | null;
  open: boolean;
  onClose: () => void;
};

export default function CardLibraryModal({ card, open, onClose }: Props) {
  if (!open || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[95vw] max-w-5xl rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
        >
          CLOSE
        </button>

        <div className="grid gap-6 md:grid-cols-2">

          {/* LEFT - IMAGE */}
          <div className="flex items-center justify-center rounded-xl border border-white/10 bg-black/40 p-4">
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt={card.name}
                className="max-h-[420px] w-full object-contain"
              />
            ) : (
              <div className="text-white/40">No image</div>
            )}
          </div>

          {/* RIGHT - DETAILS */}
          <div className="flex flex-col gap-4">

            {/* NAME */}
            <h2 className="text-2xl font-semibold text-white">
              {card.name}
            </h2>

            {/* WHISPER */}
            {card.whisper && (
              <p className="text-sm italic text-white/60">
                {card.whisper}
              </p>
            )}

            {/* EFFECT */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">
                Effect
              </p>
              <p className="mt-1 text-white">
                {card.effect}
              </p>
            </div>

            {/* USE */}
            {card.useText && (
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">
                  Use
                </p>
                <p className="mt-1 text-white">
                  {card.useText}
                </p>
              </div>
            )}

            {/* LORE */}
            {card.lore && (
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">
                  Lore
                </p>
                <p className="mt-1 text-white/80 leading-relaxed">
                  {card.lore}
                </p>
              </div>
            )}

            {/* SOURCE */}
            {card.source && (
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">
                  Discovered In
                </p>
                <p className="mt-1 text-white/80">
                  {card.source}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
