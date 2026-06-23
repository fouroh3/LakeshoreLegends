export {};

const pagePath = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
const isTeacherFinalExaminer =
  pagePath === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") === "1";
const isStudentFinalExaminer =
  pagePath === "finalexaminer" && !isTeacherFinalExaminer;

function updateTeacherHealHelper() {
  if (!isTeacherFinalExaminer) return;

  const helper = Array.from(document.querySelectorAll<HTMLElement>("div")).find(
    (element) => element.textContent?.trim() === "Restore this class's raid HP"
  );

  if (helper) helper.textContent = "Restore this raid party's HP";
}

function updateChamberStoryCopy() {
  if (!isStudentFinalExaminer) return;

  const chamber = Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) =>
    section.textContent?.includes("FINAL EXAMINER HP")
  );
  if (!chamber) return;

  const identity = chamber.querySelector<HTMLElement>("div.flex.items-center.gap-4 > div:last-child");
  const label = identity?.querySelector<HTMLElement>(":scope > div:first-child");
  const subtitle = identity?.querySelector<HTMLElement>(":scope > p");
  if (!label || !subtitle) return;

  const defeatedMinions = Array.from(document.querySelectorAll<HTMLElement>("article.group")).filter((card) =>
    card.textContent?.includes("QUEST BOSS") && card.textContent?.includes("DEFEATED")
  ).length;

  const hpFills = Array.from(chamber.querySelectorAll<HTMLElement>("div[style*='width']"));
  const hpFill = hpFills[hpFills.length - 1];
  const hpPercent = Number.parseFloat(hpFill?.style.width || "100");

  if (hpPercent <= 0) {
    label.textContent = "EXAMINER DEFEATED";
    subtitle.textContent = "The final test is complete.";
  } else if (defeatedMinions < 5) {
    label.textContent = "THE TRIAL AWAITS";
    subtitle.textContent = "Defeat every minion to face the final test.";
  } else if (hpPercent <= 25) {
    label.textContent = "THE FINAL STAND";
    subtitle.textContent = "The trial is nearly over. End it.";
  } else {
    label.textContent = "THE FINAL TRIAL BEGINS";
    subtitle.textContent = "Stand together. Survive the final test.";
  }
}

if (isTeacherFinalExaminer) {
  window.setTimeout(updateTeacherHealHelper, 300);
  window.setInterval(updateTeacherHealHelper, 500);
}

if (isStudentFinalExaminer) {
  window.setTimeout(updateChamberStoryCopy, 300);
  window.setInterval(updateChamberStoryCopy, 500);
}
