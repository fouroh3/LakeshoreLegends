const isTeacherConsole =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") === "1";

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

if (isTeacherConsole) {
  window.setTimeout(updateTeacherLabels, 300);
  window.setInterval(updateTeacherLabels, 1000);
}
