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
    (heading) => heading.textContent?.trim() === "The Final Examiner"
  );
  const copyColumn = title?.parentElement as HTMLElement | null;
  const leftColumn = copyColumn?.parentElement as HTMLElement | null;
  const finalPanel = leftColumn?.parentElement as HTMLElement | null;
  const hpPanel = finalPanel?.lastElementChild as HTMLElement | null;
  const logo = leftColumn?.querySelector<HTMLImageElement>("img");

  if (title && copyColumn && leftColumn && finalPanel && hpPanel) {
    finalPanel.style.gridTemplateColumns = "minmax(0, 1fr) 300px";
    finalPanel.style.columnGap = "1rem";

    leftColumn.style.minWidth = "0";
    leftColumn.style.display = "flex";
    leftColumn.style.alignItems = "center";
    leftColumn.style.gap = "1rem";
    leftColumn.style.overflow = "hidden";

    copyColumn.style.minWidth = "0";
    copyColumn.style.flex = "1 1 0%";
    copyColumn.style.width = "calc(100% - 88px)";
    copyColumn.style.maxWidth = "calc(100% - 88px)";

    hpPanel.style.width = "300px";
    hpPanel.style.minWidth = "300px";
    hpPanel.style.overflow = "hidden";

    title.style.display = "block";
    title.style.width = "100%";
    title.style.maxWidth = "100%";
    title.style.minWidth = "0";
    title.style.whiteSpace = "normal";
    title.style.overflow = "visible";
    title.style.overflowWrap = "anywhere";
    title.style.wordBreak = "break-word";
    title.style.fontSize = "clamp(1.65rem, 2vw, 2.25rem)";
    title.style.lineHeight = "1.04";

    if (logo) {
      logo.style.filter = "none";
      logo.style.dropShadow = "none";
      logo.style.boxShadow = "none";
    }
  }

  document.querySelectorAll<HTMLElement>("#root article.group[class*='from-emerald-950/35']").forEach((card) => {
    const deadMark = card.querySelector<HTMLElement>(".final-examiner-dead-badge");
    if (deadMark) {
      deadMark.style.border = "0";
      deadMark.style.background = "transparent";
      deadMark.style.boxShadow = "none";
    }
  });
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
}
