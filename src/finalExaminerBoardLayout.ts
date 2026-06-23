const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

function sizeFinalExaminerBoard() {
  if (!onFinalExaminerBoard) return;

  const raidPartiesLabel = Array.from(document.querySelectorAll<HTMLElement>("#root div")).find(
    (element) => element.textContent?.trim() === "RAID PARTIES"
  );

  const classColumn = raidPartiesLabel?.closest<HTMLElement>("section");
  const boardGrid = classColumn?.parentElement as HTMLElement | null;

  if (classColumn && boardGrid) {
    boardGrid.style.gridTemplateColumns = "240px minmax(0, 1fr)";
    classColumn.style.minWidth = "0";
  }

  const title = Array.from(document.querySelectorAll<HTMLHeadingElement>("#root h2")).find(
    (heading) => heading.textContent?.trim().replace(/\s+/g, " ") === "The Final Examiner"
  );
  const copyColumn = title?.parentElement as HTMLElement | null;
  const leftColumn = copyColumn?.parentElement as HTMLElement | null;
  const finalPanel = leftColumn?.parentElement as HTMLElement | null;
  const hpPanel = finalPanel?.lastElementChild as HTMLElement | null;
  const logo = leftColumn?.querySelector<HTMLImageElement>("img");

  if (title && copyColumn && leftColumn && finalPanel && hpPanel) {
    finalPanel.style.gridTemplateColumns = "minmax(0, 1fr) 300px";
    finalPanel.style.columnGap = "2rem";
    finalPanel.style.alignItems = "center";
    finalPanel.style.minHeight = "238px";
    finalPanel.style.flex = "0 0 auto";

    leftColumn.style.minWidth = "0";
    leftColumn.style.display = "flex";
    leftColumn.style.alignItems = "center";
    leftColumn.style.gap = "1.25rem";
    leftColumn.style.overflow = "hidden";

    copyColumn.style.minWidth = "0";
    copyColumn.style.flex = "1 1 0%";
    copyColumn.style.maxWidth = "100%";
    copyColumn.style.overflow = "hidden";
    copyColumn.style.background = "transparent";
    copyColumn.style.boxShadow = "none";

    hpPanel.style.width = "300px";
    hpPanel.style.minWidth = "300px";
    hpPanel.style.maxWidth = "300px";
    hpPanel.style.overflow = "hidden";
    hpPanel.style.alignSelf = "center";

    if (title.dataset.finalExaminerBrokenTitle !== "true") {
      title.innerHTML = "The Final<br />Examiner";
      title.dataset.finalExaminerBrokenTitle = "true";
    }

    title.style.display = "block";
    title.style.width = "100%";
    title.style.maxWidth = "100%";
    title.style.minWidth = "0";
    title.style.whiteSpace = "normal";
    title.style.overflow = "hidden";
    title.style.overflowWrap = "normal";
    title.style.wordBreak = "normal";
    title.style.fontSize = "clamp(1.85rem, 2.35vw, 2.65rem)";
    title.style.lineHeight = "0.98";
    title.style.background = "transparent";
    title.style.boxShadow = "none";
    title.style.textShadow = "none";

    if (logo) {
      logo.style.filter = "none";
      logo.style.boxShadow = "none";
      logo.style.opacity = "1";
    }
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
}
