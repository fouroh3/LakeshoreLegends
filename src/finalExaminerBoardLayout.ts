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

  if (!title || !copyColumn || !leftColumn || !finalPanel || !hpPanel) return;

  finalPanel.style.gridTemplateColumns = "minmax(0, 1fr) 320px";
  finalPanel.style.columnGap = "2.5rem";
  finalPanel.style.alignItems = "center";
  finalPanel.style.minHeight = "228px";
  finalPanel.style.padding = "1.75rem 2rem";

  leftColumn.style.minWidth = "0";
  leftColumn.style.display = "flex";
  leftColumn.style.alignItems = "center";
  leftColumn.style.gap = "1.5rem";
  leftColumn.style.overflow = "visible";
  leftColumn.style.background = "transparent";
  leftColumn.style.boxShadow = "none";

  copyColumn.style.minWidth = "0";
  copyColumn.style.flex = "1 1 0%";
  copyColumn.style.maxWidth = "100%";
  copyColumn.style.overflow = "visible";
  copyColumn.style.background = "transparent";
  copyColumn.style.boxShadow = "none";
  copyColumn.style.filter = "none";

  hpPanel.style.width = "320px";
  hpPanel.style.minWidth = "320px";
  hpPanel.style.maxWidth = "320px";
  hpPanel.style.padding = "1.25rem 1.5rem";
  hpPanel.style.overflow = "hidden";
  hpPanel.style.alignSelf = "center";

  if (title.dataset.finalExaminerSingleLine !== "true") {
    title.textContent = "The Final Examiner";
    title.dataset.finalExaminerSingleLine = "true";
  }

  title.style.display = "block";
  title.style.width = "100%";
  title.style.maxWidth = "100%";
  title.style.minWidth = "0";
  title.style.whiteSpace = "nowrap";
  title.style.overflow = "visible";
  title.style.textOverflow = "clip";
  title.style.fontSize = "clamp(2rem, 2.65vw, 3rem)";
  title.style.lineHeight = "1";
  title.style.letterSpacing = "-0.055em";
  title.style.background = "transparent";
  title.style.boxShadow = "none";
  title.style.textShadow = "none";
  title.style.filter = "none";

  if (logo) {
    logo.style.height = "96px";
    logo.style.width = "96px";
    logo.style.flex = "0 0 96px";
    logo.style.filter = "none";
    logo.style.boxShadow = "none";
    logo.style.opacity = "1";
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
}
