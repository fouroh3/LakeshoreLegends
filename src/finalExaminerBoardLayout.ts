const onFinalExaminerBoard =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") !== "1";

function important(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, "important");
}

function sizeFinalExaminerBoard() {
  if (!onFinalExaminerBoard) return;

  const compact = window.innerWidth < 1700;
  const sizes = compact
    ? {
        classColumn: "190px",
        hpColumn: "238px",
        panelGap: "1rem",
        panelHeight: "198px",
        panelPadding: "2.3rem 1.25rem .7rem",
        identityGap: ".75rem",
        logo: "64px",
        title: "2.15rem",
        subtitle: ".78rem",
        hpHeight: "112px",
        hpPadding: ".7rem .85rem",
      }
    : {
        classColumn: "220px",
        hpColumn: "280px",
        panelGap: "1.5rem",
        panelHeight: "236px",
        panelPadding: "1.55rem 2.1rem",
        identityGap: "1.1rem",
        logo: "96px",
        title: "3.25rem",
        subtitle: ".95rem",
        hpHeight: "150px",
        hpPadding: "1rem 1.15rem",
      };

  const raidPartiesLabel = Array.from(document.querySelectorAll<HTMLElement>("#root div")).find(
    (element) => element.textContent?.trim() === "RAID PARTIES"
  );
  const classColumn = raidPartiesLabel?.closest<HTMLElement>("section");
  const boardGrid = classColumn?.parentElement as HTMLElement | null;

  if (classColumn && boardGrid) {
    important(boardGrid, "grid-template-columns", `${sizes.classColumn} minmax(0, 1fr)`);
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

  important(finalPanel, "grid-template-columns", `minmax(0, 1fr) ${sizes.hpColumn}`);
  important(finalPanel, "column-gap", sizes.panelGap);
  important(finalPanel, "align-items", "center");
  important(finalPanel, "min-height", sizes.panelHeight);
  important(finalPanel, "padding", sizes.panelPadding);

  important(leftColumn, "min-width", "0");
  important(leftColumn, "display", "flex");
  important(leftColumn, "align-items", "center");
  important(leftColumn, "gap", sizes.identityGap);
  important(leftColumn, "overflow", "hidden");

  important(copyColumn, "min-width", "0");
  important(copyColumn, "flex", "1 1 0%");
  important(copyColumn, "max-width", "100%");
  important(copyColumn, "overflow", "hidden");
  important(copyColumn, "background", "transparent");
  important(copyColumn, "box-shadow", "none");
  important(copyColumn, "filter", "none");

  important(hpPanel, "width", sizes.hpColumn);
  important(hpPanel, "min-width", sizes.hpColumn);
  important(hpPanel, "max-width", sizes.hpColumn);
  important(hpPanel, "min-height", sizes.hpHeight);
  important(hpPanel, "padding", sizes.hpPadding);
  important(hpPanel, "overflow", "hidden");
  important(hpPanel, "align-self", "center");

  title.textContent = "The Final Examiner";
  important(title, "display", "block");
  important(title, "width", "100%");
  important(title, "max-width", "100%");
  important(title, "min-width", "0");
  important(title, "white-space", "nowrap");
  important(title, "overflow", "hidden");
  important(title, "text-overflow", "clip");
  important(title, "font-size", sizes.title);
  important(title, "line-height", ".95");
  important(title, "letter-spacing", compact ? "-0.02em" : "-0.025em");
  important(title, "background", "transparent");
  important(title, "box-shadow", "none");
  important(title, "text-shadow", "none");
  important(title, "filter", "none");

  const subtitle = copyColumn.querySelector<HTMLElement>("p");
  if (subtitle) {
    important(subtitle, "margin-top", compact ? ".3rem" : ".55rem");
    important(subtitle, "font-size", sizes.subtitle);
    important(subtitle, "line-height", "1.2");
  }

  if (logo) {
    important(logo, "height", sizes.logo);
    important(logo, "width", sizes.logo);
    important(logo, "flex", `0 0 ${sizes.logo}`);
    important(logo, "filter", "none");
    important(logo, "box-shadow", "none");
    important(logo, "opacity", "1");
  }
}

if (onFinalExaminerBoard) {
  window.setTimeout(sizeFinalExaminerBoard, 200);
  window.setInterval(sizeFinalExaminerBoard, 1000);
  window.addEventListener("resize", sizeFinalExaminerBoard);
}
