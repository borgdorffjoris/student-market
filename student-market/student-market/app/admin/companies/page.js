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

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, company_name, created_at")
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/invite-company", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
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
        <table className="table-base">
          <thead>
            <tr>
              <th>Company</th>
              <th>Email</th>
              <th>Invited</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>{c.company_name || <span className="text-ink/40">—</span>}</td>
                <td>{c.email}</td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-ink/40">
                  No companies invited yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
