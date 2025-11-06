import React from "react";
import type { Student } from "../types";
import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";

type Density = "compact" | "ultra";

export default function AbilitiesDashboard({
  data,
  columns,
  density,
}: {
  data: Student[];
  columns: number;
  density: Density;
}) {
  return (
    <AbilitiesGrid columns={columns} density={density}>
      {data.map((p, i) => (
        <AbilityCard
          key={p.id ?? `${p.first}-${p.last}-${i}`}
          person={p}
          density={density}
        />
      ))}
    </AbilitiesGrid>
  );
}
