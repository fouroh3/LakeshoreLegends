import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import FinalExaminerRaid from "./pages/battle/FinalExaminerRaid";
import "./index.css";
import "./finalExaminerVictory.css";
import "./finalExaminerCritical.css";
import "./finalExaminerBossCards.css";
import "./finalExaminerMinionEffects.css";
import "./finalExaminerClassDanger.css";
import "./finalExaminerImpactEffects.css";
import "./finalExaminerTeacherScroll.css";
import "./finalExaminerTeacherRoute";
import "./finalExaminerLiveTicker";

const finalExaminerPath = window.location.pathname
  .replace(/^\/+|\/+$/g, "")
  .toLowerCase();

const isFinalExaminerRoute =
  finalExaminerPath === "finalexaminer" ||
  finalExaminerPath === "finalexaminer/teacher";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isFinalExaminerRoute ? <FinalExaminerRaid /> : <App />}
  </React.StrictMode>
);
