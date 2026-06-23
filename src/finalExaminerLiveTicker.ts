import "./finalExaminerChamberEnergy.css";
import "./finalExaminerSmartboard.css";
import "./finalExaminerLargeDisplay.css";
import "./finalExaminerProjector.css";
import "./finalExaminerWordmark.css";
import "./finalExaminerBossTitleFit.css";
import "./finalExaminerTeacherLabels";
import "./finalExaminerTeacherNotice";
import "./finalExaminerPhaseMessage";
import "./finalExaminerChamberState";
import "./finalExaminerEventColumn";

const TICKER_API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  (import.meta as any).env?.VITE_HP_WEB_APP_URL ||
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const RAID_ID = "final_examiner_2026";
let lastEventId = "";
let hasPrimedLatestEvent = false;

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

  if (action === "STRIKE") return `${party} struck ${bossNameFromKey(String(event.targetBossKey || ""))} for ${amount}.`;
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

  const active = ["border-cyan-300/30", "bg-cyan-400/14", "text-cyan-100", "shadow-[0_0_18px_rgba(34,211,238,0.12)]"];
  const inactive = ["border-white/10", "bg-white/5", "text-white/80"];

  battleLink.classList.remove(...active);
  battleLink.classList.add(...inactive);
  finalLink.classList.remove(...inactive);
  finalLink.classList.add(...active);
}

function forceFinalBossTitleFit() {
  const title = Array.from(document.querySelectorAll<HTMLHeadingElement>("#root h2")).find(
    (heading) => heading.textContent?.trim() === "The Final Examiner"
  );
  if (!title) return;

  const copy = title.parentElement;
  const leftColumn = copy?.parentElement;
  const panel = title.closest<HTMLElement>("section");

  if (panel) {
    panel.style.gridTemplateColumns = "minmax(0, 1fr) 280px";
  }

  if (leftColumn) {
    leftColumn.style.minWidth = "0";
    leftColumn.style.overflow = "hidden";
  }

  if (copy) {
    copy.style.minWidth = "0";
    copy.style.overflow = "hidden";
  }

  title.style.maxWidth = "100%";
  title.style.whiteSpace = "normal";
  title.style.overflowWrap = "anywhere";
  title.style.wordBreak = "break-word";
  title.style.fontSize = "clamp(1.45rem, 2vw, 2rem)";
  title.style.lineHeight = "1.05";
}

function findCardWithText(text: string) {
  if (!text) return null;
  return Array.from(document.querySelectorAll<HTMLElement>("#root article, #root section")).find((element) =>
    element.textContent?.includes(text)
  ) || null;
}

function eventIdFrom(event: any) {
  return String(event?.timestamp || "") + String(event?.classKey || "") + String(event?.action || "") + String(event?.targetBossKey || "") + String(event?.appliedAmount || "");
}

function playImpact(event: any) {
  const eventId = eventIdFrom(event);
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

    if (!hasPrimedLatestEvent) {
      lastEventId = eventIdFrom(data.latestEvent);
      hasPrimedLatestEvent = true;
      return;
    }

    playImpact(data.latestEvent);
  } catch {
    // Keep the board usable if this optional update is unavailable.
  }
}

const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

if (onFinalExaminerBoard) {
  window.setTimeout(() => {
    setFinalExaminerNavActive();
    forceFinalBossTitleFit();
    void refreshTicker();
  }, 450);
  window.setInterval(() => {
    setFinalExaminerNavActive();
    forceFinalBossTitleFit();
    void refreshTicker();
  }, 2000);
}
