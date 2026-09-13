"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // add form
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editNumber, setEditNumber] = useState("");
  const [editName, setEditName] = useState("");

  const [csvBusy, setCsvBusy] = useState(false);
  const [csvSummary, setCsvSummary] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("students").select("*");
    setStudents(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    let list = students;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.student_number.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : a.student_number.localeCompare(b.student_number)
    );
  }, [students, search, sortBy]);

  async function handleAdd(e) {
    e.preventDefault();
    setAddError("");
    if (!newNumber.trim() || !newName.trim()) return;

    const { error } = await supabase
      .from("students")
      .insert({ student_number: newNumber.trim(), name: newName.trim() });

    if (error) {
      setAddError(
        error.code === "23505"
          ? "That student number already exists."
          : error.message
      );
      return;
    }

    setNewNumber("");
    setNewName("");
    load();
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditNumber(s.student_number);
    setEditName(s.name);
  }

  async function saveEdit(id) {
    const { error } = await supabase
      .from("students")
      .update({ student_number: editNumber.trim(), name: editName.trim() })
      .eq("id", id);
    if (!error) {
      setEditingId(null);
      load();
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this student?")) return;
    await supabase.from("students").delete().eq("id", id);
    load();
  }

  async function handleCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvBusy(true);
    setCsvSummary("");

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    // Supports optional header row containing "number"/"name", comma-separated.
    let dataLines = lines;
    if (/number/i.test(lines[0]) && /name/i.test(lines[0])) {
      dataLines = lines.slice(1);
    }

    const rows = dataLines
      .map((l) => l.split(","))
      .filter((parts) => parts.length >= 2)
      .map((parts) => ({
        student_number: parts[0].trim(),
        name: parts.slice(1).join(",").trim(),
      }))
      .filter((r) => r.student_number && r.name);

    if (rows.length === 0) {
      setCsvSummary("No valid rows found. Expect: student_number,name per line.");
      setCsvBusy(false);
      e.target.value = "";
      return;
    }

    const { error, count } = await supabase
      .from("students")
      .upsert(rows, { onConflict: "student_number", count: "exact" });

    setCsvBusy(false);
    e.target.value = "";

    if (error) {
      setCsvSummary(`Import failed: ${error.message}`);
    } else {
      setCsvSummary(`Imported ${rows.length} students.`);
      load();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-forest">Students</h2>
        <p className="text-ink/60">Add students one at a time, or import a CSV.</p>
      </div>

      <div className="card grid gap-6 sm:grid-cols-2">
        <form onSubmit={handleAdd} className="space-y-3">
          <h3 className="font-medium text-ink">Add a student</h3>
          <input
            className="input"
            placeholder="Student number"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
          />
          <input
            className="input"
            placeholder="Full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          {addError && <p className="text-sm text-danger">{addError}</p>}
          <button className="btn btn-primary">Add student</button>
        </form>

        <div className="space-y-3">
          <h3 className="font-medium text-ink">Import from CSV</h3>
          <p className="text-sm text-ink/60">
            Each line: <code>student_number,name</code>. A header row is optional.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            disabled={csvBusy}
            className="text-sm"
          />
          {csvBusy && <p className="text-sm text-ink/50">Importing…</p>}
          {csvSummary && <p className="text-sm text-forest">{csvSummary}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by name or number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 text-sm">
          <span className="text-ink/50">Sort by:</span>
          <button
            className={sortBy === "name" ? "font-semibold text-forest" : "text-ink/60"}
            onClick={() => setSortBy("name")}
          >
            Name
          </button>
          <span className="text-ink/30">·</span>
          <button
            className={sortBy === "number" ? "font-semibold text-forest" : "text-ink/60"}
            onClick={() => setSortBy("number")}
          >
            Number
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : (
        <table className="table-base">
          <thead>
            <tr>
              <th>Student #</th>
              <th>Name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id}>
                {editingId === s.id ? (
                  <>
                    <td>
                      <input
                        className="input"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </td>
                    <td className="space-x-2 whitespace-nowrap">
                      <button
                        className="btn btn-primary text-xs"
                        onClick={() => saveEdit(s.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-secondary text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{s.student_number}</td>
                    <td>{s.name}</td>
                    <td className="space-x-2 whitespace-nowrap">
                      <button
                        className="text-sm text-forest underline"
                        onClick={() => startEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-danger underline"
                        onClick={() => handleDelete(s.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-ink/40">
                  No students match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
