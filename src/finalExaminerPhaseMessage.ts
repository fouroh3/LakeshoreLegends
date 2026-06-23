export {};

const studentBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

function updatePhaseMessage() {
  if (!studentBoard) return;

  const board = document.querySelector<HTMLElement>("#root main");
  const chamber = Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) =>
    section.textContent?.includes("FINAL EXAMINER HP")
  );
  if (!board || !chamber) return;

  const identity = chamber.querySelector<HTMLElement>("div.flex.items-center.gap-4 > div:last-child");
  const label = identity?.querySelector<HTMLElement>(":scope > div:first-child");
  const subtitle = identity?.querySelector<HTMLElement>(":scope > p");
  if (!label || !subtitle) return;

  if (board.textContent?.includes("FINAL BOSS")) {
    label.textContent = "THE FINAL TRIAL BEGINS";
    subtitle.textContent = "Stand together. Survive the final test.";
  }
}

if (studentBoard) {
  window.setInterval(updatePhaseMessage, 400);
}
