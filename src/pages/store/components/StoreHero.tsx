import { pill, shellCardBase } from "../storeTheme";

type Props = {
  guildShellGlow: string;
  guildTintBg: string;
  rosterCount: number;
  storeErr: string | null;
  noHomerooms: boolean;
};

export default function StoreHero({
  guildShellGlow,
  guildTintBg,
  rosterCount,
  storeErr,
  noHomerooms,
}: Props) {
  return (
    <section
      className={`${shellCardBase} border-white/[0.05] px-5 py-5 sm:px-6 ${guildShellGlow} ${guildTintBg}`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">
            Attribute Store
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Spend XP. Increase core attributes.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62 sm:text-[15px]">
            Select a legend, preview the upgrade, and confirm the purchase to
            apply a permanent stat increase.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={pill}>
            <span className="text-white/42">Flow</span>
            <span className="font-semibold">Select → Preview → Confirm</span>
          </span>
          <span className={pill}>
            <span className="text-white/42">Logs</span>
            <span className="font-semibold">Teacher verifiable</span>
          </span>
          <span className={pill}>
            <span className="text-white/42">Roster</span>
            <span className="font-semibold">{rosterCount} legends</span>
          </span>
        </div>
      </div>

      {storeErr && (
        <div className="mt-4 rounded-2xl border border-red-500/14 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          Store status couldn’t be refreshed right now. Showing last known
          state. Details: {storeErr}
        </div>
      )}

      {noHomerooms && (
        <div className="mt-4 rounded-2xl border border-red-500/14 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          No homerooms were found in the roster data. Check the published
          sheet/CSV for a valid <b>Homeroom</b> column.
        </div>
      )}
    </section>
  );
}
