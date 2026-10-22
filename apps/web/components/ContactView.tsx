"use client";

import { useI18n } from "@/lib/i18n";

export function ContactView({
  telegramBot,
  supportTelegram,
}: {
  telegramBot: string;
  supportTelegram: string;
}) {
  const { pick } = useI18n();

  const support = supportTelegram.trim().replace(/^@/, "");
  const bot = telegramBot.trim().replace(/^@/, "");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">{pick("ဆက်သွယ်ရန်", "Contact us")}</h1>

      <p className="text-sm leading-relaxed text-neutral-500">
        {pick(
          "အော်ဒါ အခြေအနေ၊ အရွယ်အစား မေးခွန်း သို့မဟုတ် လဲလှယ်မှု အတွက် Telegram မှ အမြန်ဆုံး ဆက်သွယ်နိုင်ပါသည်။",
          "The fastest way to reach us about an order, sizing, or an exchange is Telegram.",
        )}
      </p>

      <div className="space-y-3 rounded-lg border border-neutral-200 p-4 text-sm">
        {bot !== "" ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {pick("အော်ဒါ ဘော့", "Order bot")}
            </p>
            <a
              href={`https://t.me/${bot}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block min-h-11 text-telegram-700 underline"
            >
              @{bot}
            </a>
          </div>
        ) : null}

        {support !== "" ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {pick("အကူအညီ", "Support")}
            </p>
            <a
              href={`https://t.me/${support}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block min-h-11 text-telegram-700 underline"
            >
              @{support}
            </a>
          </div>
        ) : null}

        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {pick("ဖုန်း", "Phone")}
          </p>
          <p className="price mt-1">09 000 000 000</p>
          <p className="text-xs text-neutral-500">
            {pick("တနင်္လာ–စနေ၊ ၉:၀၀ – ၁၈:၀၀", "Mon–Sat, 9:00 – 18:00")}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {pick("လိပ်စာ", "Address")}
          </p>
          <p className="mt-1">
            {pick(
              "ရန်ကုန်မြို့၊ စမ်းချောင်းမြို့နယ် (ပြင်ဆင်ဆဲ)",
              "Sanchaung Township, Yangon (placeholder)",
            )}
          </p>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        {pick(
          "eComReg မှတ်ပုံတင်ခြင်း — ဆောင်ရွက်လျက်ရှိသည်။",
          "eComReg registration — in progress.",
        )}
      </p>
    </div>
  );
}
