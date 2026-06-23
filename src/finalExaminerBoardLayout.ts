const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

function important(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, "important");
}

function sizeFinalExaminerBoard() {
  if (!onFinalExaminerBoard) return;

  const raidPartiesLabel = Array.from(document.querySelectorAll<HTMLElement>("#root div")).find(
    (element) => element.textContent?.trim() === "RAID PARTIES"
  );
  const classColumn = raidPartiesLabel?.closest<HTMLElement>("section");
  const boardGrid = classColumn?.parentElement as HTMLElement | null;

  if (classColumn && boardGrid) {
    important(boardGrid, "grid-template-columns", "220px minmax(0, 1fr)");
    important(classColumn, "min-width", "0");
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

  important(finalPanel, "grid-template-columns", "minmax(0, 1fr) 290px");
  important(finalPanel, "column-gap", "1.75rem");
  important(finalPanel, "align-items", "center");
  important(finalPanel, "min-height", "252px");
  important(finalPanel, "padding", "1.8rem 2.25rem");

  important(leftColumn, "min-width", "0");
  important(leftColumn, "display", "flex");
  important(leftColumn, "align-items", "center");
  important(leftColumn, "gap", "1.35rem");
  important(leftColumn, "overflow", "visible");

  important(copyColumn, "min-width", "0");
  important(copyColumn, "flex", "1 1 0%");
  important(copyColumn, "max-width", "100%");
  important(copyColumn, "overflow", "visible");
  important(copyColumn, "background", "transparent");
  important(copyColumn, "box-shadow", "none");
  important(copyColumn, "filter", "none");

  important(hpPanel, "width", "290px");
  important(hpPanel, "min-width", "290px");
  important(hpPanel, "max-width", "290px");
  important(hpPanel, "min-height", "164px");
  important(hpPanel, "padding", "1.1rem 1.35rem");
  important(hpPanel, "overflow", "hidden");
  important(hpPanel, "align-self", "center");

  title.textContent = "The Final Examiner";
  important(title, "display", "block");
  important(title, "width", "100%");
  important(title, "max-width", "100%");
  important(title, "min-width", "0");
  important(title, "white-space", "nowrap");
  important(title, "overflow", "visible");
  important(title, "text-overflow", "clip");
  important(title, "font-size", "3.55rem");
  important(title, "line-height", ".94");
  important(title, "letter-spacing", "-0.035em");
  important(title, "background", "transparent");
  important(title, "box-shadow", "none");
  important(title, "text-shadow", "none");
  important(title, "filter", "none");

  if (logo) {
    important(logo, "height", "104px");
    important(logo, "width", "104px");
    important(logo, "flex", "0 0 104px");
    important(logo, "filter", "none");
    important(logo, "box-shadow", "none");
    important(logo, "opacity", "1");
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
}
