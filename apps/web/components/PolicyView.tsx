"use client";

import { useI18n } from "@/lib/i18n";

export type PolicySection = {
  heading_mm: string;
  heading_en: string;
  body_mm: string;
  body_en: string;
};

export function PolicyView({
  titleMm,
  titleEn,
  introMm,
  introEn,
  sections,
}: {
  titleMm: string;
  titleEn: string;
  introMm: string;
  introEn: string;
  sections: PolicySection[];
}) {
  const { pick } = useI18n();

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">{pick(titleMm, titleEn)}</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {pick(introMm, introEn)}
        </p>
      </header>

      {sections.map((section, index) => (
        <section key={section.heading_en} className="space-y-2">
          <h2 className="text-sm font-semibold">
            {index + 1}. {pick(section.heading_mm, section.heading_en)}
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-500">
            {pick(section.body_mm, section.body_en)}
          </p>
        </section>
      ))}
    </article>
  );
}
