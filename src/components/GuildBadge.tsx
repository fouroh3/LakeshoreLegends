// src/components/GuildBadge.tsx

import type { Guild } from "../types";

import scoutsPng from "../assets/guilds/scouts.png";
import guardiansPng from "../assets/guilds/guardians.png";
import bladesPng from "../assets/guilds/blades.png";
import shadowsPng from "../assets/guilds/shadows.png";
import scholarsPng from "../assets/guilds/scholars.png";
import diplomatsPng from "../assets/guilds/diplomats.png";

const guildImage: Record<Guild, string> = {
  Scouts: scoutsPng,
  Guardians: guardiansPng,
  Blades: bladesPng,
  Shadows: shadowsPng,
  Scholars: scholarsPng,
  Diplomats: diplomatsPng,
};

export function GuildBadge({
  guild,
  size = 40,
}: {
  guild?: Guild;
  size?: number;
}) {
  if (!guild) return null;
  const src = guildImage[guild];

  return (
    <img
      src={src}
      alt={guild}
      title={guild}
      style={{ width: size, height: "auto" }}
      className="mx-auto drop-shadow-lg"
    />
  );
}
