"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

function toE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("95")) return `+${digits}`;
  if (digits.startsWith("0")) return `+95${digits.slice(1)}`;
  return `+95${digits}`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: toE164(phone),
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
      phone: toE164(phone),
      token: code,
      type: "sms",
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

      {stage === "phone" ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
              Phone number
            </label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="09xxxxxxxxx"
              inputMode="tel"
              className="w-full rounded border border-hairline bg-raised p-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={busy || phone.replace(/\D/g, "").length < 8}
            className="w-full rounded bg-soot py-3 text-sm uppercase tracking-[0.08em] text-canvas disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send OTP"}
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
              className="w-full rounded border border-hairline bg-raised p-3 text-sm tracking-[0.3em]"
            />
          </div>
          <button
            type="button"
            onClick={verifyOtp}
            disabled={busy || code.length < 4}
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
