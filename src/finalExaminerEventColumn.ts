import "./finalExaminerEventColumn.css";

const API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  (import.meta as any).env?.VITE_HP_WEB_APP_URL ||
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const isStudentBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

function formatTime(raw: unknown) {
  const date = new Date(String(raw || ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function message(event: any) {
  const unit = String(event?.classLabel || event?.classKey || "Raid party");
  const amount = Number(event?.appliedAmount || 0).toLocaleString();
  const action = String(event?.action || "").toUpperCase();
  const target = String(event?.targetBossName || event?.targetBossKey || "").replace(/_/g, " ");

  if (event?.kind === "UNLOCK") return "THE FINAL EXAM HAS BEGUN — The Final Examiner enters the arena.";
  if (action === "HEAL") return `${unit} restored ${amount} raid HP.`;
  if (action === "DAMAGE") return `${unit} took ${amount} raid damage.`;
  if (action === "STRIKE") return `${unit} struck ${target || "the enemy"} for ${amount}.`;
  return String(event?.message || "Raid event recorded.");
}

function render(events: any[]) {
  const main = document.querySelector<HTMLElement>("#root main");
  if (!main) return;

  let column = document.querySelector<HTMLElement>("#final-examiner-chronicle");
  if (!column) {
    column = document.createElement("aside");
    column.id = "final-examiner-chronicle";
    column.setAttribute("aria-label", "Raid Chronicle");
    document.body.appendChild(column);
  }

  const rows = events.slice(0, 80).map((event) => {
    const action = String(event?.action || event?.kind || "EVENT").toUpperCase();
    return `<article class="final-examiner-chronicle-row"><div class="final-examiner-chronicle-meta"><span>${formatTime(event?.timestamp)}</span><span>${action}</span></div><div class="final-examiner-chronicle-copy">${message(event)}</div></article>`;
  }).join("");

  column.innerHTML = `<div class="final-examiner-chronicle-head"><div><div class="final-examiner-chronicle-kicker">RAID CHRONICLE</div><h2>Battle History</h2></div><span>${events.length}</span></div><div class="final-examiner-chronicle-list">${rows || '<div class="final-examiner-chronicle-empty">Actions will appear here as the raid unfolds.</div>'}</div>`;
}

async function refresh() {
  if (!isStudentBoard) return;
  try {
    const response = await fetch(`${API_URL}?action=finalexaminerstate&raidId=final_examiner_2026&_=${Date.now()}`);
    const data = await response.json();
    if (!data?.ok || !Array.isArray(data?.events)) return;
    render(data.events);
  } catch {
    // Keep the last rendered history visible if a poll fails.
  }
}

if (isStudentBoard) {
  window.setTimeout(() => void refresh(), 600);
  window.setInterval(() => void refresh(), 2000);
}
