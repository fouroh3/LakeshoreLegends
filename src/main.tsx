import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import FinalExaminerRaid from "./pages/battle/FinalExaminerRaid";
import "./index.css";
import "./finalExaminerVictory.css";
import "./finalExaminerCritical.css";
import "./finalExaminerBossCards.css";

const isFinalExaminerRoute =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() ===
  "finalexaminer";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isFinalExaminerRoute ? <FinalExaminerRaid /> : <App />}
  </React.StrictMode>
);
