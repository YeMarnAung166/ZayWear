import Link from "next/link";
import Image from "next/image";

import { serverGet } from "@/lib/server";

interface Product {
  id: number;
  name: string;
  description: string | null;
  base_price: string;
  image_url: string | null;
}

function formatMmk(value: string | number): string {
  return `${new Intl.NumberFormat("en-US").format(Number(value))} MMK`;
}

const CATEGORIES = [
  "All Pieces",
  "Linen & Voile",
  "Everyday Basics",
  "Outerwear",
  "Accessories",
];

const DELIVERY_FEATURES = [
  {
    icon: "map",
    title: "330+ Townships",
    body: "Prompt dispatch across Yangon, Mandalay, Naypyidaw, Taunggyi, Mawlamyine, and rural districts via reliable local courier networks.",
    note: "Daily Order Processing",
  },
  {
    icon: "payments",
    title: "Flexible Payments",
    body: "Enjoy hassle-free Cash on Delivery (COD) right at your doorstep, or instant secure digital transfers via KBZPay and WavePay.",
    note: "Zero Transaction Surcharges",
  },
  {
    icon: "published_with_changes",
    title: "7-Day Size Exchange",
    body: "Need a different drape or waist fit? Request a quick courier pickup or exchange package within 7 days with zero hesitation.",
    note: "Doorstep Swap in Yangon",
  },
];

export default async function HomePage() {
  let products: Product[] = [];
  try {
    products = await serverGet<Product[]>("/products");
  } catch {
    products = [];
  }

  const hero = products[0] ?? null;
  const story = products[1] ?? products[0] ?? null;

  return (
    <main className="flex-grow">
      <section className="mx-auto w-full max-w-7xl px-space-lg pt-6 md:px-margin md:pt-10">
        <div className="relative grid min-h-[580px] grid-cols-1 overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-low lg:grid-cols-12">
          <div className="z-10 flex flex-col justify-between p-8 md:p-14 lg:col-span-6">
            <div className="max-w-lg space-y-4">
              <span className="inline-block rounded-lg border border-surface-container-highest bg-surface px-3 py-1 text-label-md font-label-md uppercase tracking-wider text-secondary">
                Harmonious Craftsmanship — Yangon Atelier
              </span>
              <h1 className="font-display-hero text-display-hero-mobile font-normal leading-tight text-primary md:text-display-hero">
                New Arrivals — Effortless everyday wear
              </h1>
              <p className="pt-2 font-body-lg text-body-lg font-normal text-on-surface-variant">
                Thoughtfully crafted garments designed for tropical comfort and
                contemporary elegance.
              </p>
            </div>

            <div className="space-y-8 pt-8">
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/#new-arrivals"
                  className="rounded-lg bg-primary-container px-8 py-3.5 text-label-md font-label-md tracking-wider text-surface-bright transition-colors hover:bg-[#2b2b2b]"
                >
                  Shop now
                </Link>
                <Link
                  href="/#atelier"
                  className="rounded-lg border border-primary-container bg-surface px-6 py-3.5 text-label-md font-label-md text-primary transition-colors hover:bg-surface-container"
                >
                  Explore Lookbook
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-6 border-t border-surface-container-highest pt-4 text-body-sm font-body-sm text-on-surface-variant">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    eco
                  </span>
                  <span>100% Breathable Organic Cotton</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    local_shipping
                  </span>
                  <span>Yangon & Mandalay next-day delivery</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative min-h-[320px] bg-gradient-to-br from-[#efeae1] via-[#e6dccd] to-[#d6c4ad] lg:col-span-6">
            {hero?.image_url && (
              <Image
                src={hero.image_url}
                alt={hero.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                priority
              />
            )}
            <div className="absolute bottom-4 right-4 rounded-lg border border-surface-container-highest bg-surface/90 px-3 py-1.5 text-label-sm font-label-sm text-on-surface-variant backdrop-blur-sm">
              Edition 04 / Rain & Mist Series
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-space-lg py-4 md:px-margin">
        <div className="no-scrollbar flex items-center justify-between overflow-x-auto border-b border-surface-container-highest pb-2">
          <div className="flex items-center space-x-3 text-label-md font-label-md">
            {CATEGORIES.map((category, index) => (
              <button
                key={category}
                type="button"
                className={`whitespace-nowrap rounded-lg px-4 py-2 transition-colors ${
                  index === 0
                    ? "bg-primary-container font-medium text-surface-bright"
                    : "border border-surface-container-highest bg-surface text-on-surface-variant hover:bg-surface-container hover:text-primary"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="new-arrivals"
        className="mx-auto w-full max-w-7xl px-space-lg py-space-xl md:px-margin"
      >
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="mb-1 block text-label-md font-label-md uppercase tracking-widest text-secondary">
              Seasonal Selection
            </span>
            <h2 className="font-headline-lg text-headline-lg font-normal tracking-tight text-primary">
              New Arrivals
            </h2>
            <p className="mt-1 max-w-md text-body-md font-body-md text-on-surface-variant">
              Harmonious wardrobe anchors constructed from raw tactile fibers,
              designed for Myanmar&apos;s climate.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="text-on-surface-variant">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group flex flex-col overflow-hidden rounded-lg bg-surface"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-low">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-outline-variant">
                      <span className="material-symbols-outlined text-[40px]">
                        checkroom
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-3 bottom-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="block w-full rounded-lg bg-primary-container py-2.5 text-center text-label-md font-label-md text-surface-bright shadow-sm">
                      View Piece
                    </span>
                  </div>
                </div>
                <div className="flex flex-grow flex-col pb-1 pt-3">
                  <h3 className="font-body-md text-body-md font-medium text-primary transition-colors group-hover:text-secondary">
                    {product.name}
                  </h3>
                  <p className="mt-1 font-body-md text-body-md font-semibold text-primary">
                    {formatMmk(product.base_price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-7xl px-space-lg py-10 md:px-margin">
        <div className="rounded-lg border border-surface-container-highest bg-surface-container-low p-8 md:p-12">
          <div className="mb-8 max-w-2xl">
            <span className="mb-2 block text-label-md font-label-md uppercase tracking-widest text-secondary">
              Frictionless Nationwide Commerce
            </span>
            <h2 className="font-headline-md text-headline-md text-primary">
              Township Delivery & Payment Options
            </h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Built purposefully for seamless doorstep experiences across all
              regions of Myanmar.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {DELIVERY_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col justify-between rounded-lg border border-surface-container-highest bg-surface p-6"
              >
                <div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <span className="material-symbols-outlined text-[24px]">
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className="mb-2 font-headline-sm text-headline-sm text-primary">
                    {feature.title}
                  </h3>
                  <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                    {feature.body}
                  </p>
                </div>
                <div className="mt-4 border-t border-surface-container-highest pt-4 text-label-sm font-label-sm font-medium text-secondary">
                  {feature.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="atelier"
        className="mx-auto w-full max-w-7xl px-space-lg pb-space-xl md:px-margin"
      >
        <div className="grid grid-cols-1 items-center gap-gutter rounded-lg border border-surface-container-highest bg-surface-container p-8 md:p-12 lg:grid-cols-2">
          <div className="space-y-4">
            <span className="text-label-md font-label-md uppercase tracking-widest text-secondary">
              Mindful Garment Philosophy
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary">
              Rooted in climate, elevated by craft.
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              We avoid mass seasons in favor of intentional capsule runs. Every
              seam is engineered for breathability under humid skies, pairing
              traditional handloom sensibilities with razor-sharp modern
              tailoring.
            </p>
            <div className="pt-4">
              <Link
                href="/#new-arrivals"
                className="inline-flex items-center text-label-md font-label-md font-semibold text-primary underline underline-offset-8 transition-colors hover:text-secondary"
              >
                Read our Myanmar Textile Archive Journal
              </Link>
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-surface-container-highest bg-gradient-to-br from-[#efeae1] to-[#d6c4ad]">
            {story?.image_url && (
              <Image
                src={story.image_url}
                alt={story.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
