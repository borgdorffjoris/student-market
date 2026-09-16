"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("That email and password combination doesn't work.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin") router.replace("/admin");
    else if (profile?.role === "company") router.replace("/company");
    else {
      setError("This account isn't set up yet. Contact the organizer.");
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    if (!forgotEmail.trim()) return;

    setForgotSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setForgotSending(false);

    if (error) {
      setForgotError(error.message);
    } else {
      setForgotMessage("If that email has an account, a reset link is on its way.");
    }
  }

  if (showForgot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 font-display text-3xl font-semibold text-forest">
            Reset your password
          </h1>
          <p className="mb-8 text-ink/60">
            Enter your email and we'll send you a link to set a new password.
          </p>

          <form onSubmit={handleForgotSubmit} className="card space-y-4">
            <div>
              <label className="mb-1 block text-sm text-ink/70">Email</label>
              <input
                className="input"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            {forgotError && <p className="text-sm text-danger">{forgotError}</p>}
            {forgotMessage && <p className="text-sm text-forest">{forgotMessage}</p>}

            <button className="btn btn-primary w-full" disabled={forgotSending}>
              {forgotSending ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <button
            className="mt-4 text-sm text-forest underline"
            onClick={() => {
              setShowForgot(false);
              setForgotMessage("");
              setForgotError("");
            }}
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl font-semibold text-forest">
          Student Market
        </h1>
        <p className="mb-8 text-ink/60">Sign in to continue.</p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm text-ink/70">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/70">Password</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <button
          className="mt-4 text-sm text-forest underline"
          onClick={() => setShowForgot(true)}
        >
          Forgot password?
        </button>
      </div>
    </main>
  );
}
