export {};

const pagePath = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
const isTeacherFinalExaminer =
  pagePath === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") === "1";

function updateTeacherHealHelper() {
  if (!isTeacherFinalExaminer) return;

  const helper = Array.from(document.querySelectorAll<HTMLElement>("div")).find(
    (element) => element.textContent?.trim() === "Restore this class's raid HP"
  );

  if (helper) helper.textContent = "Restore this raid party's HP";
}

if (isTeacherFinalExaminer) {
  window.setTimeout(updateTeacherHealHelper, 300);
  window.setInterval(updateTeacherHealHelper, 500);
}
