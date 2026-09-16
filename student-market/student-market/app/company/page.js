"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function getDefaultSession() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : "afternoon";
}

function fullName(s) {
  return [s.first_name, s.infix, s.last_name].filter(Boolean).join(" ");
}

export default function CompanyPage() {
  const [userId, setUserId] = useState(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [status, setStatus] = useState(null); // { type: 'ok'|'error', text }
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(getDefaultSession());

  const [maxMorning, setMaxMorning] = useState(null);
  const [maxAfternoon, setMaxAfternoon] = useState(null);
  const [morningInput, setMorningInput] = useState("");
  const [afternoonInput, setAfternoonInput] = useState("");
  const [savingMax, setSavingMax] = useState(false);
  const [maxMessage, setMaxMessage] = useState("");

  async function load() {
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession) return;
    setUserId(authSession.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("max_morning, max_afternoon")
      .eq("id", authSession.user.id)
      .maybeSingle();
    setMaxMorning(profile?.max_morning ?? null);
    setMaxAfternoon(profile?.max_afternoon ?? null);
    setMorningInput(profile?.max_morning ?? "");
    setAfternoonInput(profile?.max_afternoon ?? "");

    const { data } = await supabase
      .from("registrations")
      .select("id, session, created_at, students(student_number, first_name, infix, last_name)")
      .eq("company_id", authSession.user.id)
      .order("created_at", { ascending: false });

    setRegistered(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const morningCount = registered.filter((r) => r.session === "morning").length;
  const afternoonCount = registered.filter((r) => r.session === "afternoon").length;

  async function handleSaveMax(e) {
    e.preventDefault();
    setSavingMax(true);
    setMaxMessage("");

    const morningValue = morningInput === "" ? null : Number(morningInput);
    const afternoonValue = afternoonInput === "" ? null : Number(afternoonInput);

    const { error } = await supabase
      .from("profiles")
      .update({ max_morning: morningValue, max_afternoon: afternoonValue })
      .eq("id", userId);

    setSavingMax(false);
    if (error) {
      setMaxMessage(error.message);
    } else {
      setMaxMorning(morningValue);
      setMaxAfternoon(afternoonValue);
      setMaxMessage("Saved.");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setStatus(null);
    const number = studentNumber.trim();
    if (!number) return;

    setBusy(true);

    const { data: student, error: findError } = await supabase
      .from("students")
      .select("id, first_name, infix, last_name, student_number")
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
      session,
    });

    setBusy(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setStatus({
          type: "error",
          text: `${fullName(student)} already has a ${session} registration (with another company).`,
        });
      } else {
        setStatus({ type: "error", text: insertError.message });
      }
      return;
    }

    setStatus({
      type: "ok",
      text: `Registered ${fullName(student)} (${student.student_number}) for the ${session} session.`,
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
        <p className="text-ink/60">Choose the session, then enter a student number.</p>
      </div>

      <div className="flex gap-2">
        <button
          className={session === "morning" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setSession("morning")}
        >
          Morning {maxMorning != null && `(${morningCount}/${maxMorning})`}
        </button>
        <button
          className={session === "afternoon" ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setSession("afternoon")}
        >
          Afternoon {maxAfternoon != null && `(${afternoonCount}/${maxAfternoon})`}
        </button>
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
          {busy ? "Checking…" : `Register for ${session}`}
        </button>
      </form>

      {status && (
        <p className={status.type === "ok" ? "text-forest" : "text-danger"}>
          {status.text}
        </p>
      )}

      <details className="card">
        <summary className="cursor-pointer font-medium text-ink">
          Your capacity per session
        </summary>
        <form onSubmit={handleSaveMax} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-ink/70">Max in the morning</label>
            <input
              type="number"
              min="0"
              className="input w-36"
              placeholder="Unlimited"
              value={morningInput}
              onChange={(e) => setMorningInput(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/70">Max in the afternoon</label>
            <input
              type="number"
              min="0"
              className="input w-36"
              placeholder="Unlimited"
              value={afternoonInput}
              onChange={(e) => setAfternoonInput(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={savingMax}>
            {savingMax ? "Saving…" : "Save"}
          </button>
          {maxMessage && <span className="text-sm text-forest">{maxMessage}</span>}
        </form>
        <p className="mt-2 text-sm text-ink/50">Leave a field empty for no limit.</p>
      </details>

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
                  <td>{r.students ? fullName(r.students) : ""}</td>
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
