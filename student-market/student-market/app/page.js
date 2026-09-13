"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function route() {
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

      if (profile?.role === "admin") router.replace("/admin");
      else if (profile?.role === "company") router.replace("/company");
      else router.replace("/login");
    }
    route();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper">
      <p className="font-body text-ink/50">Loading…</p>
    </main>
  );
}
