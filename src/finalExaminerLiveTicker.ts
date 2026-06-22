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
  return names[key] || key || "the target";
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

function findExistingTicker() {
  const banner = document.querySelector("#root main > section:first-of-type");
  if (!banner) return null;

  return Array.from(banner.querySelectorAll<HTMLElement>("div")).find((element) =>
    element.textContent?.includes("LIVE FEED")
  ) || null;
}

async function refreshTicker() {
  const ticker = findExistingTicker();
  if (!ticker) return;

  try {
    const response = await fetch(`${TICKER_API_URL}?action=finalexaminerstate&raidId=${encodeURIComponent(RAID_ID)}&_=${Date.now()}`);
    const data = await response.json();
    if (!data?.ok) return;

    ticker.innerHTML = `<span class="mr-2 text-[9px] font-black tracking-[0.18em] text-cyan-300">LIVE FEED</span>${formatLatestEvent(data.latestEvent)}`;
  } catch {
    // The smartboard stays usable if this optional update is unavailable.
  }
}

const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

if (onFinalExaminerBoard) {
  window.setTimeout(() => void refreshTicker(), 450);
  window.setInterval(() => void refreshTicker(), 2000);
}
