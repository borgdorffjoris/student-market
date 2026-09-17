"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMorning, setEditMorning] = useState("");
  const [editAfternoon, setEditAfternoon] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  async function authHeader() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, company_name, max_morning, max_afternoon, created_at")
      .eq("role", "company")
      .order("created_at", { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) return;

    setSending(true);
    const headers = await authHeader();

    const res = await fetch("/api/invite-company", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ email: email.trim(), companyName: companyName.trim() }),
    });

    const result = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(result.error || "Something went wrong.");
      return;
    }

    setMessage(`Invite sent to ${email.trim()}.`);
    setEmail("");
    setCompanyName("");
    load();
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.company_name || "");
    setEditEmail(c.email);
    setEditMorning(c.max_morning ?? "");
    setEditAfternoon(c.max_afternoon ?? "");
    setEditError("");
  }

  async function saveEdit(id, originalEmail) {
    setSavingEdit(true);
    setEditError("");

    // Update name + capacity via the normal client (allowed by RLS).
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_name: editName.trim() || null,
        max_morning: editMorning === "" ? null : Number(editMorning),
        max_afternoon: editAfternoon === "" ? null : Number(editAfternoon),
      })
      .eq("id", id);

    if (profileError) {
      setSavingEdit(false);
      setEditError(profileError.message);
      return;
    }

    // Email changes need the admin API (it touches the login itself).
    if (editEmail.trim() !== originalEmail) {
      const headers = await authHeader();
      const res = await fetch("/api/update-company", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ companyId: id, email: editEmail.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        setSavingEdit(false);
        setEditError(result.error || "Failed to update email.");
        return;
      }
      if (result.warning) {
        setMessage(result.warning);
      } else {
        setMessage(`Email updated — a password reset link was sent to ${editEmail.trim()}.`);
      }
    }

    setSavingEdit(false);
    setEditingId(null);
    load();
  }

  async function handleDelete(company) {
    if (
      !confirm(
        `Remove ${company.company_name || company.email}? This deletes their login and all their registrations.`
      )
    )
      return;

    const headers = await authHeader();
    const res = await fetch("/api/delete-company", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ companyId: company.id }),
    });

    if (res.ok) load();
    else {
      const result = await res.json();
      alert(result.error || "Failed to delete.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-forest">Companies</h2>
        <p className="text-ink/60">
          Invite a company by email — they'll get a link to set their password.
        </p>
      </div>

      <form onSubmit={handleInvite} className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="input"
          placeholder="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <input
          className="input"
          type="email"
          placeholder="contact@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn btn-primary" disabled={sending}>
          {sending ? "Sending…" : "Send invite"}
        </button>
        {error && <p className="text-sm text-danger sm:col-span-3">{error}</p>}
        {message && <p className="text-sm text-forest sm:col-span-3">{message}</p>}
      </form>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Company</th>
                <th>Email</th>
                <th>Max morning</th>
                <th>Max afternoon</th>
                <th>Invited</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  {editingId === c.id ? (
                    <>
                      <td>
                        <input
                          className="input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          placeholder="Unlimited"
                          value={editMorning}
                          onChange={(e) => setEditMorning(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          placeholder="Unlimited"
                          value={editAfternoon}
                          onChange={(e) => setEditAfternoon(e.target.value)}
                        />
                      </td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="space-x-2 whitespace-nowrap">
                        <button
                          className="btn btn-primary text-xs"
                          onClick={() => saveEdit(c.id, c.email)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          className="btn btn-secondary text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                        {editError && (
                          <p className="mt-1 text-xs text-danger">{editError}</p>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{c.company_name || <span className="text-ink/40">—</span>}</td>
                      <td>{c.email}</td>
                      <td>{c.max_morning ?? <span className="text-ink/40">Unlimited</span>}</td>
                      <td>{c.max_afternoon ?? <span className="text-ink/40">Unlimited</span>}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="space-x-2 whitespace-nowrap">
                        <button
                          className="text-sm text-forest underline"
                          onClick={() => startEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm text-danger underline"
                          onClick={() => handleDelete(c)}
                        >
                          Remove
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink/40">
                    No companies invited yet.
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
