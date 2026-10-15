"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    setBusy(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStage("code");
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.push(searchParams.get("redirect") ?? "/my-orders");
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-8 text-2xl font-normal">Sign in to ZayWear</h1>

      {stage === "email" ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
              Email address
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
              className="w-full rounded border border-hairline bg-raised p-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={busy || !EMAIL_PATTERN.test(email.trim())}
            className="w-full rounded bg-soot py-3 text-sm uppercase tracking-[0.08em] text-canvas disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
              6-digit code
            </label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full rounded border border-hairline bg-raised p-3 text-sm tracking-[0.3em]"
            />
          </div>
          <button
            type="button"
            onClick={verifyOtp}
            disabled={busy || code.trim().length < 4}
            className="w-full rounded bg-soot py-3 text-sm uppercase tracking-[0.08em] text-canvas disabled:opacity-40"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-16" />}>
      <LoginForm />
    </Suspense>
  );
}
