export {};

const teacherPage =
  window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase() === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") === "1";

let previousMessage = "";

function clearTeacherConfirmation() {
  if (!teacherPage) return;

  const message = Array.from(document.querySelectorAll<HTMLElement>("#root main > div")).find((element) =>
    element.textContent?.trim().endsWith("applied.")
  );

  const text = message?.textContent?.trim() || "";
  if (!message || !text || text === previousMessage) return;

  previousMessage = text;
  window.setTimeout(() => {
    if (message.textContent?.trim() === text) {
      message.style.visibility = "hidden";
    }
  }, 4000);
}

if (teacherPage) {
  window.setInterval(clearTeacherConfirmation, 250);
}
