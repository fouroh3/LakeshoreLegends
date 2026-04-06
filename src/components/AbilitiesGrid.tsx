// src/components/AbilitiesGrid.tsx

import React from "react";

export default function AbilitiesGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid gap-4 px-2 sm:gap-5 sm:px-4"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}
    >
      {children}
    </div>
  );
}
