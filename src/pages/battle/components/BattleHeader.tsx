// src/pages/battle/components/BattleHeader.tsx
import { useState } from "react";
import logoUrl from "../../../assets/Lakeshore Legends Logo.png";

export default function BattleHeader({ onBack }: { onBack: () => void }) {
  const [showSessionInfo, setShowSessionInfo] = useState(false);

  return (
    <div className="shrink-0 px-3 sm:px-4 lg:px-6 py-2 border-b border-zinc-800 bg-black/50">
      <div className="flex items-center gap-3">
        <img
          src={logoUrl}
          alt="Lakeshore Legends"
          className="h-9 w-auto select-none"
          draggable={false}
        />

        <div className="min-w-0">
          <div className="text-[14px] sm:text-[15px] font-semibold text-zinc-100">
            Battle Mode
          </div>
          <div className="text-[11px] text-zinc-400">
            Select targets → pick damage/heal → submit.
          </div>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setShowSessionInfo((v) => !v)}
          className={[
            "rounded-xl border px-3 py-2 text-sm font-semibold transition",
            showSessionInfo
              ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100"
              : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
          ].join(" ")}
          aria-label="Toggle session info"
          title="Toggle session info"
        >
          i
        </button>

        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
        >
          Back
        </button>
      </div>

      {showSessionInfo && (
        <div className="mt-2 text-[11px] text-zinc-500">
          Session info is now handled in the page (optional).
        </div>
      )}
    </div>
  );
}
