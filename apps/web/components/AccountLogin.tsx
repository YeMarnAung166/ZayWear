"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { digitsOnly } from "@/lib/format";

type Stage = "idle" | "waiting" | "otp" | "phone-otp";

export function AccountLogin() {
  const { pick } = useI18n();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("idle");
  const [nonce, setNonce] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState("");
  const [phone, setPhone] = useState("09");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupPhone, setLookupPhone] = useState("09");

  useEffect(() => {
    if (stage !== "waiting" || !nonce) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (!active) {
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/telegram/poll/${encodeURIComponent(nonce)}`,
          { cache: "no-store" },
        );
        const body = (await response.json().catch(() => null)) as
          | { status?: string; phone_masked?: string }
          | null;

        if (!active) {
          return;
        }

        if (body?.status === "ok") {
          active = false;
          router.replace("/account");
          router.refresh();
          return;
        }

        if (body?.status === "otp_required") {
          active = false;
          setPhoneMasked(body.phone_masked ?? "");
          setStage("otp");
          return;
        }

        if (response.status === 410) {
          active = false;
          setError(
            pick(
              "လင့်ခ် သက်တမ်းကုန်သွားပါပြီ။ ထပ်စမ်းပါ။",
              "This login link has expired. Please try again.",
            ),
          );
          setStage("idle");
          return;
        }
      } catch {
        // Network blips are retried until the link expires.
      }

      if (active) {
        timer = setTimeout(poll, 2500);
      }
    };

    timer = setTimeout(poll, 1500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [stage, nonce, router, pick]);

  const startTelegram = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/telegram/start", { method: "POST" });
      const body = (await response.json().catch(() => null)) as
        | { data?: { nonce?: string; deep_link?: string } }
        | null;

      if (!response.ok || !body?.data?.nonce || !body.data.deep_link) {
        setError(pick("အကောင့်ဝင်ရန် မစတင်နိုင်ပါ။", "Could not start the login."));
        return;
      }

      setNonce(body.data.nonce);
      setDeepLink(body.data.deep_link);
      setStage("waiting");
    } catch {
      setError(pick("အင်တာနက် ချိတ်ဆက်မှု မရပါ။", "Could not reach the server."));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStage("idle");
    setNonce(null);
    setDeepLink(null);
    setPhoneMasked("");
    setCode("");
    setError(null);
    setNotice(null);
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code)) {
      setError(pick("ကုဒ် ၆ လုံး ရိုက်ထည့်ပါ။", "Enter the 6-digit code."));
      return;
    }

    setBusy(true);

    try {
      const payload = stage === "otp" ? { nonce, code } : { phone, code };
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setError(
          body?.message ??
            pick("ကုဒ် မမှန်ပါ သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။", "The code is invalid or expired."),
        );
        return;
      }

      router.replace("/account");
      router.refresh();
    } catch {
      setError(pick("အင်တာနက် ချိတ်ဆက်မှု မရပါ။", "Could not reach the server."));
    } finally {
      setBusy(false);
    }
  };

  const requestPhoneOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!/^09\d{7,9}$/.test(phone)) {
      setError(
        pick(
          "ဖုန်းနံပါတ်ကို 09 ဖြင့် စတင်၍ ၉ လုံးမှ ၁၁ လုံး ထည့်ပါ။",
          "Phone must start with 09 and contain 9–11 digits.",
        ),
      );
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        setError(pick("ကုဒ် ပို့၍ မရပါ။", "Could not send the code."));
        return;
      }

      setStage("phone-otp");
      setNotice(
        pick(
          "ဤဖုန်းနံပါတ်ကို Telegram နှင့် ချိတ်ဆက်ထားပါက ကုဒ် ပို့ပြီးပါပြီ။",
          "If this phone is linked to Telegram, a code was sent.",
        ),
      );
    } catch {
      setError(pick("အင်တာနက် ချိတ်ဆက်မှု မရပါ။", "Could not reach the server."));
    } finally {
      setBusy(false);
    }
  };

  const lookupOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (lookupNumber.trim() === "" || !/^09\d{7,9}$/.test(lookupPhone)) {
      setError(
        pick(
          "အော်ဒါနံပါတ်နှင့် ဖုန်းနံပါတ် မှန်ကန်စွာ ထည့်ပါ။",
          "Enter the order number and a valid phone.",
        ),
      );
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: lookupNumber.trim(),
          phone: lookupPhone,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { tracking?: { path?: string } }
        | null;

      if (!response.ok || !body?.tracking?.path) {
        setError(
          pick(
            "ဤအော်ဒါကို ရှာမတွေ့ပါ။ အော်ဒါနံပါတ်နှင့် ဖုန်းနံပါတ် ပြန်စစ်ပါ။",
            "We could not find that order. Check the order number and phone.",
          ),
        );
        return;
      }

      router.push(body.tracking.path);
    } catch {
      setError(pick("အင်တာနက် ချိတ်ဆက်မှု မရပါ။", "Could not reach the server."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-xl font-bold">{pick("အကောင့်ဝင်ရန်", "Log in")}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {pick(
            "စကားဝှက် မလိုပါ။ Telegram မှတစ်ဆင့် ဖုန်းနံပါတ်ဖြင့် ဝင်ရောက်ပါ။",
            "No password needed. Log in with your phone number through Telegram.",
          )}
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-error-500/10 px-3 py-2 text-sm text-error-500" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-md bg-success-500/10 px-3 py-2 text-sm text-success-500" role="status">
          {notice}
        </p>
      ) : null}

      {stage === "waiting" && deepLink ? (
        <section className="space-y-4 rounded-lg border border-neutral-200 p-4">
          <h2 className="text-base font-semibold">{pick("Telegram တွင် ဆက်လုပ်ပါ", "Continue in Telegram")}</h2>
          <p className="text-sm text-neutral-500">
            {pick(
              "Telegram ဖွင့်ပြီး ဖုန်းနံပါတ် မျှဝေရန် ခလုတ်ကို နှိပ်ပါ။ ပြီးပါက ဤစာမျက်နှာတွင် အလိုအလျောက် ဝင်ရောက်ပါမည်။",
              "Open Telegram and tap “Share my phone number”. This page finishes logging you in automatically.",
            )}
          </p>
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center rounded-md bg-telegram-500 px-4 text-sm font-semibold text-neutral-0"
          >
            Telegram ဖွင့်ရန် / Open Telegram
          </a>
          <p className="text-center text-xs text-neutral-500">
            {pick("စောင့်ဆိုင်းနေသည်…", "Waiting for Telegram…")}
          </p>
          <button type="button" onClick={reset} className="w-full text-center text-xs underline">
            {pick("မလုပ်တော့ပါ", "Cancel")}
          </button>
        </section>
      ) : null}

      {stage === "otp" ? (
        <form onSubmit={verifyCode} className="space-y-4 rounded-lg border border-neutral-200 p-4">
          <h2 className="text-base font-semibold">{pick("ကုဒ် ရိုက်ထည့်ပါ", "Enter your code")}</h2>
          <p className="text-sm text-neutral-500">
            {pick("Telegram သို့ ပို့ထားသော ကုဒ် ၆ လုံးကို ရိုက်ထည့်ပါ။", "Enter the 6-digit code sent to Telegram.")}{" "}
            {phoneMasked ? <span className="price">{phoneMasked}</span> : null}
          </p>
          <input
            value={code}
            onChange={(event) => setCode(digitsOnly(event.target.value).slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={pick("ကုဒ်", "Code")}
            className="price h-12 w-full rounded-md border border-neutral-200 px-3 text-center text-lg tracking-widest outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0 disabled:opacity-60"
          >
            {busy ? pick("စစ်ဆေးနေသည်…", "Checking…") : pick("ဝင်ရောက်ရန်", "Log in")}
          </button>
          <button type="button" onClick={reset} className="w-full text-center text-xs underline">
            {pick("ပြန်စရန်", "Start over")}
          </button>
        </form>
      ) : null}

      {stage === "idle" ? (
        <section className="space-y-4 rounded-lg border border-neutral-200 p-4">
          <h2 className="text-base font-semibold">{pick("Telegram ဖြင့် ဝင်ရန်", "Log in with Telegram")}</h2>
          <p className="text-sm text-neutral-500">
            {pick(
              "ပထမဆုံး အကြိမ် ဝင်ရောက်ပါက ဖုန်းနံပါတ် မျှဝေရန် လိုအပ်ပါသည်။",
              "First time here? You will share your phone number once.",
            )}
          </p>
          <button
            type="button"
            onClick={startTelegram}
            disabled={busy}
            className="min-h-12 w-full rounded-md bg-telegram-500 px-4 text-sm font-semibold text-neutral-0 disabled:opacity-60"
          >
            {busy ? pick("ခဏစောင့်ပါ…", "One moment…") : pick("Telegram ဖြင့် ဝင်ရန်", "Continue with Telegram")}
          </button>
        </section>
      ) : null}

      {stage === "idle" || stage === "phone-otp" ? (
        <form
          onSubmit={stage === "phone-otp" ? verifyCode : requestPhoneOtp}
          className="space-y-4 rounded-lg border border-neutral-200 p-4"
        >
          <h2 className="text-base font-semibold">{pick("ဖုန်းနံပါတ်ဖြင့် ဝင်ရန်", "Log in with phone")}</h2>
          <p className="text-sm text-neutral-500">
            {pick(
              "Telegram နှင့် ချိတ်ဆက်ထားသော ဖုန်းနံပါတ် ရှိပါက ကုဒ် ပို့ပါမည်။",
              "If your phone is already linked to Telegram, we will send a code there.",
            )}
          </p>

          {stage === "phone-otp" ? (
            <>
              <input
                value={code}
                onChange={(event) => setCode(digitsOnly(event.target.value).slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={pick("ကုဒ်", "Code")}
                className="price h-12 w-full rounded-md border border-neutral-200 px-3 text-center text-lg tracking-widest outline-none focus:border-neutral-900"
              />
              <button
                type="submit"
                disabled={busy}
                className="min-h-12 w-full rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0 disabled:opacity-60"
              >
                {busy ? pick("စစ်ဆေးနေသည်…", "Checking…") : pick("ဝင်ရောက်ရန်", "Log in")}
              </button>
              <button type="button" onClick={reset} className="w-full text-center text-xs underline">
                {pick("ဖုန်းနံပါတ် ပြောင်းရန်", "Use another number")}
              </button>
            </>
          ) : (
            <>
              <input
                value={phone}
                onChange={(event) => setPhone(digitsOnly(event.target.value).slice(0, 11))}
                inputMode="numeric"
                autoComplete="tel-national"
                aria-label={pick("ဖုန်းနံပါတ်", "Phone")}
                className="price h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
              />
              <button
                type="submit"
                disabled={busy}
                className="min-h-12 w-full rounded-md border border-neutral-900 px-4 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? pick("ပို့နေသည်…", "Sending…") : pick("ကုဒ် ပို့ရန်", "Send code")}
              </button>
            </>
          )}
        </form>
      ) : null}

      <section className="space-y-4 border-t border-neutral-200 pt-6">
        <h2 className="text-base font-semibold">{pick("အကောင့်မလိုဘဲ အော်ဒါ ရှာရန်", "Track an order without an account")}</h2>
        <p className="text-sm text-neutral-500">
          {pick(
            "အော်ဒါနံပါတ်နှင့် မှာယူစဉ်က ဖုန်းနံပါတ်ဖြင့် ရှာနိုင်ပါသည်။",
            "Use the order number and the phone you ordered with.",
          )}
        </p>
        <form onSubmit={lookupOrder} className="space-y-3">
          <input
            value={lookupNumber}
            onChange={(event) => setLookupNumber(event.target.value)}
            placeholder="ZW-000123"
            aria-label={pick("အော်ဒါနံပါတ်", "Order number")}
            className="price h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
          <input
            value={lookupPhone}
            onChange={(event) => setLookupPhone(digitsOnly(event.target.value).slice(0, 11))}
            inputMode="numeric"
            autoComplete="tel-national"
            aria-label={pick("ဖုန်းနံပါတ်", "Phone")}
            className="price h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-md border border-neutral-200 px-4 text-sm font-semibold disabled:opacity-60"
          >
            {pick("အော်ဒါ ရှာရန်", "Find order")}
          </button>
        </form>
      </section>

      <p className="text-center text-xs text-neutral-500">
        {pick("ဈေးဝယ်ရန် အကောင့် မလိုပါ။", "You do not need an account to place an order.")}{" "}
        <Link href="/" className="underline">
          {pick("ပစ္စည်းများ ကြည့်ရန်", "Browse products")}
        </Link>
      </p>
    </div>
  );
}
