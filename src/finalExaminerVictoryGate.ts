export {};

const apiUrl =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  (import.meta as any).env?.VITE_HP_WEB_APP_URL ||
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

async function syncVictoryGate() {
  if (!onFinalExaminerBoard) return;

  const main = document.querySelector("#root main");
  if (!main) return;

  try {
    const response = await fetch(
      `${apiUrl}?action=finalexaminerstate&raidId=final_examiner_2026&_=${Date.now()}`
    );
    const data = await response.json();
    const examiner = Array.isArray(data?.bosses)
      ? data.bosses.find((boss: any) => boss?.bossKey === "FINAL_EXAMINER")
      : null;

    main.classList.toggle(
      "final-examiner-victory-confirmed",
      examiner?.defeated === true && Number(examiner?.currentHP) <= 0
    );
  } catch {
    main.classList.remove("final-examiner-victory-confirmed");
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(() => void syncVictoryGate(), 500);
  window.setInterval(() => void syncVictoryGate(), 2000);
}
