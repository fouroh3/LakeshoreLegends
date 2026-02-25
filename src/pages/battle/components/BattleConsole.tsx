// src/pages/battle/components/BattleConsole.tsx
export default function BattleConsole(props: {
  title?: string;
  lines?: string[];
}) {
  const { title = "Console", lines = [] } = props;

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/30 p-2">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        {title}
      </div>

      {lines.length === 0 ? (
        <div className="mt-2 text-[11px] text-zinc-500">No messages.</div>
      ) : (
        <div className="mt-2 space-y-1">
          {lines.slice(0, 8).map((t, i) => (
            <div key={i} className="text-[11px] text-zinc-400">
              • {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
