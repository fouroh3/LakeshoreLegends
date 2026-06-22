const TICKER_API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const RAID_ID = "final_examiner_2026";

function bossNameFromKey(key: string) {
  const names: Record<string, string> = {
    KEEPER_SHADOWS: "The Keeper of Shadows",
    CRYPT_WARDEN: "The Crypt Warden",
    THE_ALCHEMIST: "The Alchemist of Doom",
    PLAGUEBEARER: "The Plaguebearer",
    PRISM_SENTINEL: "The Prism Sentinel",
    FINAL_EXAMINER: "The Final Examiner",
  };
  return names[key] || key;
}

function formatLatestEvent(event: any) {
  if (!event) return "The raid command board is live. Await the next class action.";

  const party = String(event.classLabel || "A raid party");
  const amount = Math.max(0, Math.round(Number(event.appliedAmount || event.requestedAmount || 0))).toLocaleString();
  const action = String(event.action || "").toUpperCase();

  if (action === "STRIKE") {
    return `${party} struck ${bossNameFromKey(String(event.targetBossKey || ""))} for ${amount}.`;
  }
  if (action === "HEAL") return `${party} restored ${amount} raid HP.`;
  if (action === "DAMAGE") return `${party} took ${amount} raid damage.`;
  return "The raid command board is live. Await the next class action.";
}

function ensureTicker() {
  const main = document.querySelector("#root main");
  if (!main || document.querySelector("#final-examiner-live-ticker")) return;

  const banner = main.querySelector("section");
  if (!banner) return;

  const ticker = document.createElement("div");
  ticker.id = "final-examiner-live-ticker";
  ticker.className = "mt-3 flex min-h-[34px] items-center justify-center rounded-xl border border-cyan-300/15 bg-black/25 px-4 text-center text-xs font-bold tracking-wide text-cyan-50 shadow-[inset_0_0_16px_rgba(34,211,238,0.05)]";
  ticker.innerHTML = '<span class="mr-2 text-[9px] font-black tracking-[0.18em] text-cyan-300">LIVE FEED</span><span>The raid command board is live. Await the next class action.</span>';
  banner.appendChild(ticker);
}

async function refreshTicker() {
  ensureTicker();
  const text = document.querySelector("#final-examiner-live-ticker span:last-child");
  if (!text) return;

  try {
    const response = await fetch(`${TICKER_API_URL}?action=finalexaminerstate&raidId=${encodeURIComponent(RAID_ID)}&_=${Date.now()}`);
    const data = await response.json();
    if (data?.ok) text.textContent = formatLatestEvent(data.latestEvent);
  } catch {
    // The main board continues to function even if the optional ticker refresh fails.
  }
}

const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

if (onFinalExaminerBoard) {
  window.setTimeout(() => void refreshTicker(), 300);
  window.setInterval(() => void refreshTicker(), 2000);
}
