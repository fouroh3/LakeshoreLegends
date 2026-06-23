export {};

const normalizedPath = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
const isFinalExaminer = normalizedPath === "finalexaminer";
const isTeacherConsole =
  isFinalExaminer && new URLSearchParams(window.location.search).get("teacher") === "1";

function updateTeacherLabels() {
  if (!isTeacherConsole) return;

  document.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
    for (const option of Array.from(select.options)) {
      if (option.value === "STRIKE") option.text = "Attack Minion / Boss";
      if (option.value === "HEAL") option.text = "Heal Raid Party";
      if (option.value === "DAMAGE") option.text = "Damage Raid Party";
    }
  });

  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const label = button.textContent?.trim();
    if (label === "Strike Boss") button.textContent = "Attack Minion / Boss";
    if (label === "Heal Class") button.textContent = "Heal Raid Party";
    if (label === "Damage Class") button.textContent = "Damage Raid Party";
  });
}

function updateChamberStoryCopy() {
  if (!isFinalExaminer || isTeacherConsole) return;

  const chamber = Array.from(document.querySelectorAll<HTMLElement>("section")).find((section) =>
    section.textContent?.includes("FINAL EXAMINER HP")
  );
  if (!chamber) return;

  const identity = chamber.querySelector<HTMLElement>("div.flex.items-center.gap-4 > div:last-child");
  if (!identity) return;

  const label = identity.querySelector<HTMLElement>(":scope > div:first-child");
  const subtitle = identity.querySelector<HTMLElement>(":scope > p");
  if (!label || !subtitle) return;

  const defeatedMinions = Array.from(document.querySelectorAll<HTMLElement>("article.group")).filter((card) =>
    card.textContent?.includes("QUEST BOSS") && card.textContent?.includes("DEFEATED")
  ).length;

  const hpFills = Array.from(chamber.querySelectorAll<HTMLElement>("div[style*='width']"));
  const hpFill = hpFills[hpFills.length - 1];
  const hpPercent = Number.parseFloat(hpFill?.style.width || "100");
  const examinerDefeated = hpPercent <= 0;

  if (examinerDefeated) {
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

if (isFinalExaminer) {
  window.setTimeout(() => {
    updateTeacherLabels();
    updateChamberStoryCopy();
  }, 300);

  window.setInterval(() => {
    updateTeacherLabels();
    updateChamberStoryCopy();
  }, 500);
}
