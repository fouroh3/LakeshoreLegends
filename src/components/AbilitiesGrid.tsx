import React from "react";

export default function AbilitiesGrid({
  children,
  columns,
  mode,
  autoMinWidth = 280, // px for responsive
}: {
  children: React.ReactNode;
  columns: number;
  mode: "auto" | "fixed";
  autoMinWidth?: number;
}) {
  if (mode === "fixed") {
    return (
      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 280px)` }}
        >
          {children}
        </div>
      </div>
    );
  }

  // Responsive — adjustable minimum card width
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${autoMinWidth}px, 100%), 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
