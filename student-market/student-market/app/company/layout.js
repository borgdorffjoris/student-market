"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CompanyLayout({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_name, email")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "company") {
        router.replace("/login");
        return;
      }

      setCompanyName(profile.company_name || profile.email);
      setAllowed(true);
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink/50">Loading…</p>
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-forest">
              Student Market
            </h1>
            <p className="text-sm text-ink/50">{companyName}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary text-sm">
            Log out
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-8">{children}</div>
    </div>
  );
}
