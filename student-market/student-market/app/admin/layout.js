"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

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
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        router.replace("/login");
        return;
      }

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

  const tabs = [
    { href: "/admin", label: "Results" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/companies", label: "Companies" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="font-display text-xl font-semibold text-forest">
            Student Market · Admin
          </h1>
          <button onClick={handleLogout} className="btn btn-secondary text-sm">
            Log out
          </button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-6 px-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 pb-3 pt-1 text-sm font-medium ${
                pathname === tab.href
                  ? "border-brass text-forest"
                  : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  );
}
