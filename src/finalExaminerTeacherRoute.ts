const normalizedPath = window.location.pathname
  .replace(/^\/+|\/+$/g, "")
  .toLowerCase();

const isTeacherPath = normalizedPath === "finalexaminer/teacher";
const isLegacyTeacherQuery =
  normalizedPath === "finalexaminer" &&
  new URLSearchParams(window.location.search).get("teacher") === "1";

function restoreCleanTeacherUrl() {
  const observer = new MutationObserver(() => {
    const teacherConsoleMounted = document.body.textContent?.includes(
      "Record a Class Action"
    );

    if (!teacherConsoleMounted) return;

    observer.disconnect();
    window.history.replaceState({}, "", "/finalexaminer/teacher");
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

/*
  FinalExaminerRaid reads ?teacher=1 during its initial render. Keep that
  flag until the teacher console mounts, then restore the clean URL.
*/
if (isTeacherPath) {
  window.history.replaceState({}, "", "/finalexaminer?teacher=1");
  restoreCleanTeacherUrl();
} else if (isLegacyTeacherQuery) {
  restoreCleanTeacherUrl();
}
