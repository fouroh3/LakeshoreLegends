import "./finalExaminerChamberEnergy.css";
import "./finalExaminerSmartboard.css";
import "./finalExaminerLargeDisplay.css";
import "./finalExaminerProjector.css";
import "./finalExaminerWordmark.css";
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
