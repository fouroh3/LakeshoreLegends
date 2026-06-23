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

  if (title && copyColumn && leftColumn && finalPanel && hpPanel) {
    finalPanel.style.gridTemplateColumns = "minmax(0, 1fr) 220px";

    leftColumn.style.minWidth = "0";
    leftColumn.style.display = "flex";
    leftColumn.style.alignItems = "center";
    leftColumn.style.gap = "1rem";

    copyColumn.style.minWidth = "0";
    copyColumn.style.flex = "1 1 0%";
    copyColumn.style.overflow = "visible";

    hpPanel.style.width = "220px";
    hpPanel.style.minWidth = "220px";

    title.style.display = "block";
    title.style.width = "100%";
    title.style.maxWidth = "100%";
    title.style.minWidth = "0";
    title.style.whiteSpace = "normal";
    title.style.overflow = "visible";
    title.style.overflowWrap = "anywhere";
    title.style.wordBreak = "break-word";
    title.style.fontSize = "clamp(1.55rem, 2vw, 2.2rem)";
    title.style.lineHeight = "1.04";
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
}
