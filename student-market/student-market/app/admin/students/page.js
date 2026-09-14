"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function fullName(s) {
  return [s.first_name, s.infix, s.last_name].filter(Boolean).join(" ");
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // add form
  const [newNumber, setNewNumber] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newInfix, setNewInfix] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newMentor, setNewMentor] = useState("");
  const [newStamgroep, setNewStamgroep] = useState("");
  const [addError, setAddError] = useState("");

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editNumber, setEditNumber] = useState("");
  const [editFirst, setEditFirst] = useState("");
  const [editInfix, setEditInfix] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editMentor, setEditMentor] = useState("");
  const [editStamgroep, setEditStamgroep] = useState("");

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
          fullName(s).toLowerCase().includes(q) ||
          s.student_number.toLowerCase().includes(q) ||
          (s.mentor || "").toLowerCase().includes(q) ||
          (s.stamgroep || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) =>
      sortBy === "name"
        ? fullName(a).localeCompare(fullName(b))
        : a.student_number.localeCompare(b.student_number)
    );
  }, [students, search, sortBy]);

  function validNumber(n) {
    return /^[0-9]{6}$/.test(n);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAddError("");
    const number = newNumber.trim();
    if (!number || !newFirst.trim() || !newLast.trim()) return;

    if (!validNumber(number)) {
      setAddError("Student number (leerlingnummer) must be exactly 6 digits.");
      return;
    }

    const { error } = await supabase.from("students").insert({
      student_number: number,
      first_name: newFirst.trim(),
      infix: newInfix.trim() || null,
      last_name: newLast.trim(),
      mentor: newMentor.trim() || null,
      stamgroep: newStamgroep.trim() || null,
    });

    if (error) {
      setAddError(
        error.code === "23505"
          ? "That student number already exists."
          : error.message
      );
      return;
    }

    setNewNumber("");
    setNewFirst("");
    setNewInfix("");
    setNewLast("");
    setNewMentor("");
    setNewStamgroep("");
    load();
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditNumber(s.student_number);
    setEditFirst(s.first_name);
    setEditInfix(s.infix || "");
    setEditLast(s.last_name);
    setEditMentor(s.mentor || "");
    setEditStamgroep(s.stamgroep || "");
  }

  async function saveEdit(id) {
    if (!validNumber(editNumber.trim())) return;
    const { error } = await supabase
      .from("students")
      .update({
        student_number: editNumber.trim(),
        first_name: editFirst.trim(),
        infix: editInfix.trim() || null,
        last_name: editLast.trim(),
        mentor: editMentor.trim() || null,
        stamgroep: editStamgroep.trim() || null,
      })
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
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).filter((l) => l.trim());

    const delimiter = (lines[0] || "").includes(";") ? ";" : ",";

    // Optional header row: leerlingnummer;voornaam;tussenvoegsel;achternaam;mentor;stamgroep
    let dataLines = lines;
    if (/nummer|number/i.test(lines[0])) {
      dataLines = lines.slice(1);
    }

    const rows = [];
    const skipped = [];

    dataLines.forEach((line) => {
      const parts = line.split(delimiter).map((p) => p.trim());
      // Expect: number, first name, infix, last name, [mentor], [stamgroep]
      // infix may be genuinely empty between two delimiters.
      if (parts.length < 3) {
        skipped.push(line);
        return;
      }

      let student_number, first_name, infix, last_name, mentor, stamgroep;

      if (parts.length >= 6) {
        [student_number, first_name, infix, last_name, mentor, stamgroep] = parts;
      } else if (parts.length === 5) {
        // Ambiguous 5th column — treat as mentor, no stamgroep.
        [student_number, first_name, infix, last_name, mentor] = parts;
      } else if (parts.length === 4) {
        [student_number, first_name, infix, last_name] = parts;
      } else {
        // 3 columns: no infix column supplied
        [student_number, first_name, last_name] = parts;
        infix = "";
      }

      if (!validNumber(student_number) || !first_name || !last_name) {
        skipped.push(line);
        return;
      }

      rows.push({
        student_number,
        first_name,
        infix: infix || null,
        last_name,
        mentor: mentor || null,
        stamgroep: stamgroep || null,
      });
    });

    if (rows.length === 0) {
      setCsvSummary(
        "No valid rows found. Expect: leerlingnummer;voornaam;tussenvoegsel;achternaam;mentor;stamgroep (6-digit number required)."
      );
      setCsvBusy(false);
      e.target.value = "";
      return;
    }

    const { error } = await supabase
      .from("students")
      .upsert(rows, { onConflict: "student_number" });

    setCsvBusy(false);
    e.target.value = "";

    if (error) {
      setCsvSummary(`Import failed: ${error.message}`);
    } else {
      setCsvSummary(
        `Imported ${rows.length} students.` +
          (skipped.length ? ` Skipped ${skipped.length} invalid row(s).` : "")
      );
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
            placeholder="Leerlingnummer (6 digits)"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            maxLength={6}
          />
          <input
            className="input"
            placeholder="Voornaam"
            value={newFirst}
            onChange={(e) => setNewFirst(e.target.value)}
          />
          <input
            className="input"
            placeholder="Tussenvoegsel (optioneel)"
            value={newInfix}
            onChange={(e) => setNewInfix(e.target.value)}
          />
          <input
            className="input"
            placeholder="Achternaam"
            value={newLast}
            onChange={(e) => setNewLast(e.target.value)}
          />
          <input
            className="input"
            placeholder="Mentor (optioneel)"
            value={newMentor}
            onChange={(e) => setNewMentor(e.target.value)}
          />
          <input
            className="input"
            placeholder="Stamgroep (optioneel)"
            value={newStamgroep}
            onChange={(e) => setNewStamgroep(e.target.value)}
          />
          {addError && <p className="text-sm text-danger">{addError}</p>}
          <button className="btn btn-primary">Add student</button>
        </form>

        <div className="space-y-3">
          <h3 className="font-medium text-ink">Import from CSV</h3>
          <p className="text-sm text-ink/60">
            Each line:{" "}
            <code>leerlingnummer;voornaam;tussenvoegsel;achternaam;mentor;stamgroep</code>.
            Tussenvoegsel, mentor and stamgroep may be left empty. A header row is optional.
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
          placeholder="Search by name, number, mentor, stamgroep…"
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
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Leerlingnummer</th>
                <th>Voornaam</th>
                <th>Tussenvoegsel</th>
                <th>Achternaam</th>
                <th>Mentor</th>
                <th>Stamgroep</th>
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
                          maxLength={6}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={editFirst}
                          onChange={(e) => setEditFirst(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={editInfix}
                          onChange={(e) => setEditInfix(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={editLast}
                          onChange={(e) => setEditLast(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={editMentor}
                          onChange={(e) => setEditMentor(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={editStamgroep}
                          onChange={(e) => setEditStamgroep(e.target.value)}
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
                      <td>{s.first_name}</td>
                      <td>{s.infix || <span className="text-ink/30">—</span>}</td>
                      <td>{s.last_name}</td>
                      <td>{s.mentor || <span className="text-ink/30">—</span>}</td>
                      <td>{s.stamgroep || <span className="text-ink/30">—</span>}</td>
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
                  <td colSpan={7} className="py-6 text-center text-ink/40">
                    No students match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
