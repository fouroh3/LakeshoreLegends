import "./finalExaminerChamberEnergy.css";
import "./finalExaminerSmartboard.css";
import "./finalExaminerWordmark.css";
import "./finalExaminerTeacherLabels";
import "./finalExaminerChamberState";

const TICKER_API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const RAID_ID = "final_examiner_2026";
let lastEventId = "";

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

function setFinalExaminerNavActive() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("header nav a"));
  const finalLink = links.find((link) => link.textContent?.trim() === "Final Examiner");
  const battleLink = links.find((link) => link.textContent?.trim() === "Battle Mode");
  if (!finalLink || !battleLink) return;

  const active = [
    "border-cyan-300/30",
    "bg-cyan-400/14",
    "text-cyan-100",
    "shadow-[0_0_18px_rgba(34,211,238,0.12)]",
  ];
  const inactive = [
    "border-white/10",
    "bg-white/5",
    "text-white/80",
  ];

  battleLink.classList.remove(...active);
  battleLink.classList.add(...inactive);
  finalLink.classList.remove(...inactive);
  finalLink.classList.add(...active);
}

function findCardWithText(text: string) {
  if (!text) return null;

  return Array.from(document.querySelectorAll<HTMLElement>("#root article, #root section")).find((element) =>
    element.textContent?.includes(text)
  ) || null;
}

function playImpact(event: any) {
  const eventId = String(event?.timestamp || "") + String(event?.classKey || "") + String(event?.action || "") + String(event?.targetBossKey || "") + String(event?.appliedAmount || "");
  if (!eventId || eventId === lastEventId) return;
  lastEventId = eventId;

  const action = String(event.action || "").toUpperCase();
  const amount = Math.max(0, Math.round(Number(event.appliedAmount || event.requestedAmount || 0))).toLocaleString();
  const target = action === "STRIKE"
    ? findCardWithText(bossNameFromKey(String(event.targetBossKey || "")))
    : findCardWithText(String(event.classLabel || ""));

  if (!target) return;

  target.classList.remove("final-examiner-impact-target", "final-examiner-impact-heal");
  void target.offsetWidth;
  target.classList.add("final-examiner-impact-target");
  if (action === "HEAL") target.classList.add("final-examiner-impact-heal");

  const number = document.createElement("div");
  number.className = "final-examiner-impact-number";
  number.textContent = action === "HEAL" ? `+${amount}` : `-${amount}`;
  target.appendChild(number);

  window.setTimeout(() => {
    number.remove();
    target.classList.remove("final-examiner-impact-target", "final-examiner-impact-heal");
  }, 1050);
}

async function refreshTicker() {
  const ticker = findExistingTicker();
  if (!ticker) return;

  try {
    const response = await fetch(`${TICKER_API_URL}?action=finalexaminerstate&raidId=${encodeURIComponent(RAID_ID)}&_=${Date.now()}`);
    const data = await response.json();
    if (!data?.ok) return;

    ticker.innerHTML = `<span class="mr-2 text-[9px] font-black tracking-[0.18em] text-cyan-300">LIVE FEED</span>${formatLatestEvent(data.latestEvent)}`;
    playImpact(data.latestEvent);
  } catch {
    // The smartboard stays usable if this optional update is unavailable.
  }
}

const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

if (onFinalExaminerBoard) {
  window.setTimeout(() => {
    setFinalExaminerNavActive();
    void refreshTicker();
  }, 450);
  window.setInterval(() => {
    setFinalExaminerNavActive();
    void refreshTicker();
  }, 2000);
}
