const normalizedPath = window.location.pathname
  .replace(/^\/+|\/+$/g, "")
  .toLowerCase();

const isTeacherPath = normalizedPath === "finalexaminer/teacher";
const isLegacyTeacherQuery =
  normalizedPath === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") === "1";

/*
  The teacher console still uses the existing internal query flag during its
  initial React render, then immediately restores the clean classroom URL.
  This keeps all current console behavior intact without exposing ?teacher=1.
*/
if (isTeacherPath) {
  window.history.replaceState({}, "", "/finalexaminer?teacher=1");

  window.setTimeout(() => {
    window.history.replaceState({}, "", "/finalexaminer/teacher");
  }, 0);
} else if (isLegacyTeacherQuery) {
  window.setTimeout(() => {
    window.history.replaceState({}, "", "/finalexaminer/teacher");
  }, 0);
}
