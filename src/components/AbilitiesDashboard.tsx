import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";
import { Student } from "../types";

export default function AbilitiesDashboard({
  data,
  columns,
  density,
  mode = "auto",
}: {
  data: Student[];
  columns: number;
  density: "Comfort" | "Compact" | "Ultra";
  mode?: "auto" | "fixed";
}) {
  const densityClasses =
    density === "Ultra"
      ? "text-xs"
      : density === "Compact"
      ? "text-[13px]"
      : "text-sm";

  return (
    <div className={densityClasses}>
      <AbilitiesGrid columns={columns} mode={mode}>
        {data.map((p) => (
          <AbilityCard key={p.id} person={p} density={density} />
        ))}
      </AbilitiesGrid>
    </div>
  );
}
