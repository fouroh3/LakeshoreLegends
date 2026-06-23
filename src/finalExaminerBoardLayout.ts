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

  if (!classColumn || !boardGrid) return;

  boardGrid.style.gridTemplateColumns = "280px minmax(0, 1fr)";
  classColumn.style.minWidth = "0";

  const title = Array.from(document.querySelectorAll<HTMLHeadingElement>("#root h2")).find(
    (heading) => heading.textContent?.trim() === "The Final Examiner"
  );
  const finalPanel = title?.closest<HTMLElement>("section");

  if (title && finalPanel) {
    finalPanel.style.gridTemplateColumns = "minmax(0, 1fr) 280px";
    title.style.maxWidth = "100%";
    title.style.whiteSpace = "normal";
    title.style.overflowWrap = "anywhere";
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
}
