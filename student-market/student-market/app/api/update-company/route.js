import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { companyId, email } = await request.json();
  if (!companyId || !email) {
    return NextResponse.json({ error: "companyId and email are required." }, { status: 400 });
  }

  // Changing the login email requires the admin API — it touches auth.users,
  // which normal clients (even the company themselves) can't modify directly.
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(companyId, {
    email,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ email })
    .eq("id", companyId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Send the new address a password-reset email so they can log in there.
  const { error: resetError } = await anonClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/set-password`,
  });

  if (resetError) {
    // Email/profile change already succeeded — just flag that the reset mail failed.
    return NextResponse.json(
      { ok: true, warning: `Email updated, but sending the reset link failed: ${resetError.message}` },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true });
}
