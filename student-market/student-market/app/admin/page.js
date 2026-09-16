"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function fullName(s) {
  return [s.first_name, s.infix, s.last_name].filter(Boolean).join(" ");
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function AdminResultsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: students } = await supabase
      .from("students")
      .select("id, student_number, first_name, infix, last_name, mentor, stamgroep")
      .order("first_name");

    const { data: registrations } = await supabase
      .from("registrations")
      .select("student_id, session, profiles(company_name, email)");

    const byStudent = {};
    (students || []).forEach((s) => {
      byStudent[s.id] = { ...s, morning: null, afternoon: null };
    });
    (registrations || []).forEach((r) => {
      if (byStudent[r.student_id]) {
        byStudent[r.student_id][r.session] =
          r.profiles?.company_name || r.profiles?.email || "Unknown company";
      }
    });

    setRows(Object.values(byStudent));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const bothDone = rows.filter((r) => r.morning && r.afternoon).length;
  const oneDone = rows.filter((r) => (r.morning ? 1 : 0) + (r.afternoon ? 1 : 0) === 1).length;

  function handleExport() {
    const headers = [
      "leerlingnummer",
      "voornaam",
      "tussenvoegsel",
      "achternaam",
      "mentor",
      "stamgroep",
      "ochtend",
      "middag",
    ];

    const lines = [headers.join(";")];
    rows.forEach((r) => {
      lines.push(
        [
          r.student_number,
          r.first_name,
          r.infix || "",
          r.last_name,
          r.mentor || "",
          r.stamgroep || "",
          r.morning || "",
          r.afternoon || "",
        ]
          .map(csvEscape)
          .join(";")
      );
    });

    // Leading BOM so Excel opens accented characters correctly.
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-market-resultaten-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-forest">Results</h2>
          <p className="text-ink/60">
            {bothDone} of {rows.length} students completed both sessions · {oneDone} completed one
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card">
          <p className="text-ink/60">
            No students yet. Add your student list under the "Students" tab.
          </p>
        </div>
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
                <th>Morning</th>
                <th>Afternoon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.student_number}</td>
                  <td>{r.first_name}</td>
                  <td>{r.infix || <span className="text-ink/30">—</span>}</td>
                  <td>{r.last_name}</td>
                  <td>{r.mentor || <span className="text-ink/30">—</span>}</td>
                  <td>{r.stamgroep || <span className="text-ink/30">—</span>}</td>
                  <td>{r.morning || <span className="text-ink/40">—</span>}</td>
                  <td>{r.afternoon || <span className="text-ink/40">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
