"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function getCurrentSession(cutoffHour) {
  const hour = new Date().getHours();
  return hour < cutoffHour ? "morning" : "afternoon";
}

export default function CompanyPage() {
  const [userId, setUserId] = useState(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [status, setStatus] = useState(null); // { type: 'ok'|'error', text }
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cutoffHour, setCutoffHour] = useState(12);
  const [session, setSession] = useState("morning");

  async function load() {
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession) return;
    setUserId(authSession.user.id);

    const { data: settings } = await supabase
      .from("settings")
      .select("cutoff_hour")
      .eq("id", 1)
      .maybeSingle();

    const cutoff = settings?.cutoff_hour ?? 12;
    setCutoffHour(cutoff);
    setSession(getCurrentSession(cutoff));

    const { data } = await supabase
      .from("registrations")
      .select("id, session, created_at, students(student_number, name)")
      .eq("company_id", authSession.user.id)
      .order("created_at", { ascending: false });

    setRegistered(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      setCutoffHour((c) => {
        setSession(getCurrentSession(c));
        return c;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    setStatus(null);
    const number = studentNumber.trim();
    if (!number) return;

    setBusy(true);
    const currentSession = getCurrentSession(cutoffHour);

    const { data: student, error: findError } = await supabase
      .from("students")
      .select("id, name, student_number")
      .eq("student_number", number)
      .maybeSingle();

    if (findError || !student) {
      setStatus({ type: "error", text: `No student found with number "${number}".` });
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase.from("registrations").insert({
      student_id: student.id,
      company_id: userId,
      session: currentSession,
    });

    setBusy(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setStatus({
          type: "error",
          text: `${student.name} already has a ${currentSession} registration (with another company).`,
        });
      } else {
        setStatus({ type: "error", text: insertError.message });
      }
      return;
    }

    setStatus({
      type: "ok",
      text: `Registered ${student.name} (${student.student_number}) for the ${currentSession} session.`,
    });
    setStudentNumber("");
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-forest">
          Register a student
        </h2>
        <p className="text-ink/60">
          Current session:{" "}
          <span className="font-medium text-forest">
            {session === "morning" ? "Morning" : "Afternoon"}
          </span>{" "}
          <span className="text-ink/40">(switches at {cutoffHour}:00)</span>
        </p>
      </div>

      <form onSubmit={handleRegister} className="card flex flex-col gap-3 sm:flex-row">
        <input
          className="input"
          placeholder="Student number"
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary whitespace-nowrap" disabled={busy}>
          {busy ? "Checking…" : "Register"}
        </button>
      </form>

      {status && (
        <p className={status.type === "ok" ? "text-forest" : "text-danger"}>
          {status.text}
        </p>
      )}

      <div>
        <h3 className="mb-3 font-medium text-ink">Your registered students</h3>
        {loading ? (
          <p className="text-ink/50">Loading…</p>
        ) : registered.length === 0 ? (
          <p className="text-ink/50">None yet.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Student #</th>
                <th>Name</th>
                <th>Session</th>
              </tr>
            </thead>
            <tbody>
              {registered.map((r) => (
                <tr key={r.id}>
                  <td>{r.students?.student_number}</td>
                  <td>{r.students?.name}</td>
                  <td className="capitalize">{r.session}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
