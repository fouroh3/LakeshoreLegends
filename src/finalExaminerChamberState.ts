function updateFinalExaminerChamberState() {
  const chamber = Array.from(document.querySelectorAll<HTMLElement>("#root main section")).find((section) =>
    section.textContent?.includes("FINAL EXAMINER HP")
  );

  if (!chamber) return;
  chamber.classList.toggle("final-examiner-chamber-active", chamber.textContent?.includes("FINAL PHASE ACTIVE") === true);
}

const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer";

if (onFinalExaminerBoard) {
  window.setTimeout(updateFinalExaminerChamberState, 300);
  window.setInterval(updateFinalExaminerChamberState, 1000);
}
