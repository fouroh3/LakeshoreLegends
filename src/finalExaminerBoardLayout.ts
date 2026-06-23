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
  const finalPanel = title?.closest<HTMLElement>("section");
  const titleColumn = title?.parentElement?.parentElement as HTMLElement | null;
  const hpPanel = finalPanel?.lastElementChild as HTMLElement | null;

  if (title && finalPanel && titleColumn && hpPanel) {
    finalPanel.style.gridTemplateColumns = "minmax(0, 1fr) 220px";
    titleColumn.style.minWidth = "0";
    titleColumn.style.overflow = "hidden";
    hpPanel.style.width = "220px";
    hpPanel.style.minWidth = "220px";
    title.style.maxWidth = "100%";
    title.style.whiteSpace = "normal";
    title.style.overflowWrap = "anywhere";
    title.style.fontSize = "clamp(1.65rem, 2.3vw, 2.45rem)";
    title.style.lineHeight = "1.02";
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
}
