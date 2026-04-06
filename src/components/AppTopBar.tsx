// src/components/AppTopBar.tsx

import logoUrl from "../assets/Lakeshore Legends Logo.png";

type TopBarView = "dashboard" | "store" | "cards" | "battle";

type Props = {
  title: string;
  activeView: TopBarView;
  onNavigate: (view: TopBarView) => void;
  shownText?: string;
};

function navButtonClass(active: boolean) {
  return [
    "rounded-full border px-4 py-2 text-sm font-medium transition",
    active
      ? "border-cyan-300/30 bg-cyan-400/14 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
      : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

export default function AppTopBar({
  title,
  activeView,
  onNavigate,
  shownText,
}: Props) {
  return (
    <header className="sticky top-0 z-[80] border-b border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.92),rgba(7,10,18,0.82))] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center justify-center gap-3 md:justify-start">
            <img
              src={logoUrl}
              alt="Lakeshore Legends"
              className="h-10 w-auto shrink-0 select-none sm:h-11"
              draggable={false}
            />
            <h1 className="text-center text-2xl font-bold leading-tight text-zinc-100 md:text-left">
              {title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className={navButtonClass(activeView === "dashboard")}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => onNavigate("store")}
              className={navButtonClass(activeView === "store")}
            >
              Store
            </button>

            <button
              type="button"
              onClick={() => onNavigate("cards")}
              className={navButtonClass(activeView === "cards")}
            >
              Cards
            </button>

            <button
              type="button"
              onClick={() => onNavigate("battle")}
              className={navButtonClass(activeView === "battle")}
            >
              Battle Mode
            </button>

            {shownText ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                {shownText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
