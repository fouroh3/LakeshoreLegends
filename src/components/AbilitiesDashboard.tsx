import React from "react";
import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";
import type { Student } from "../types";

export default function AbilitiesDashboard({
  data,
  columns,
  density,
  mode,
  autoMinWidth = 280,
}: {
  data: Student[];
  columns: number;
  density: "comfortable" | "compact" | "ultra";
  mode: "auto" | "fixed";
  autoMinWidth?: number;
}) {
  return (
    <AbilitiesGrid columns={columns} mode={mode} autoMinWidth={autoMinWidth}>
      {data.map((p) => (
        <AbilityCard
          key={p.id ?? `${p.first}-${p.last}`}
          person={p}
          density={density}
        />
      ))}
    </AbilitiesGrid>
  );
}
