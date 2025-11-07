type Props = {
  text: string;
};

export default function SkillPill({ text }: Props) {
  return (
    <span
      className="rounded-full bg-zinc-800/80 border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700/80 transition"
      title={text}
    >
      {text}
    </span>
  );
}
