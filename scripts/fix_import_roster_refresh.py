from pathlib import Path

p = Path("src/pages/admin/AdminPage.tsx")
s = p.read_text(encoding="utf-8")

old = '''      const result = await adminImportStudents(rows);
      const imported = Array.isArray(result.students) ? result.students : [];

      if (imported.length) {
        setStudents((prev) => {
          const existingIds = new Set(prev.map((student) => normId(student.id)));
          const additions = imported
            .filter((record) => !existingIds.has(normId(record.studentId)))
            .map(importedRecordToStudent);

          return [...prev, ...additions];
        });
      }

      await Promise.all([reloadStudents(), reloadSystemStatus()]);
'''

new = '''      const result = await adminImportStudents(rows);
      const imported = Array.isArray(result.students) ? result.students : [];
      const importedStudents = imported.map(importedRecordToStudent);

      // The published Master CSV can lag briefly behind Apps Script writes.
      // Reconcile the forced refresh with the backend-confirmed imports so a
      // newly created student never disappears from the live roster while
      // Google finishes propagating the published CSV.
      const refreshed = await loadStudents({ force: true });
      setStudents(() => {
        const byId = new Map(
          (Array.isArray(refreshed) ? refreshed : []).map((student) => [
            normId(student.id),
            student,
          ])
        );

        importedStudents.forEach((student) => {
          const id = normId(student.id);
          if (id && !byId.has(id)) byId.set(id, student);
        });

        return Array.from(byId.values());
      });

      await reloadSystemStatus();
'''

if old not in s:
    raise RuntimeError("Could not find import refresh block")

p.write_text(s.replace(old, new, 1), encoding="utf-8")
