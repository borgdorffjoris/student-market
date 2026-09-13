"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminResultsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: students } = await supabase
      .from("students")
      .select("id, student_number, name")
      .order("name");

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-forest">Results</h2>
        <p className="text-ink/60">
          {bothDone} of {rows.length} students completed both sessions · {oneDone} completed one
        </p>
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
        <table className="table-base">
          <thead>
            <tr>
              <th>Student #</th>
              <th>Name</th>
              <th>Morning</th>
              <th>Afternoon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.student_number}</td>
                <td>{r.name}</td>
                <td>{r.morning || <span className="text-ink/40">—</span>}</td>
                <td>{r.afternoon || <span className="text-ink/40">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
