"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
  const [cutoffHour, setCutoffHour] = useState(12);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await supabase
      .from("settings")
      .select("cutoff_hour")
      .eq("id", 1)
      .maybeSingle();
    setCutoffHour(data?.cutoff_hour ?? 12);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("settings")
      .upsert({ id: 1, cutoff_hour: Number(cutoffHour) });

    setSaving(false);
    setMessage(error ? error.message : "Saved.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-forest">Settings</h2>
        <p className="text-ink/60">
          Choose the hour the day switches from the morning session to the afternoon
          session. Companies see this automatically based on the current time.
        </p>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="card max-w-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm text-ink/70">
              Afternoon starts at (24h clock, e.g. 12 = 12:00 / noon)
            </label>
            <input
              type="number"
              min="0"
              max="23"
              className="input"
              value={cutoffHour}
              onChange={(e) => setCutoffHour(e.target.value)}
            />
          </div>
          {message && <p className="text-sm text-forest">{message}</p>}
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
