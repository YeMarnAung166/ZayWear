import Link from "next/link";
import Image from "next/image";

import ProductPurchase from "@/components/ProductPurchase";
import { serverGet } from "@/lib/server";
import type { Variant } from "@/components/VariantSelector";

interface Product {
  id: number;
  name: string;
  description: string | null;
  base_price: string;
  image_url: string | null;
  variants: Variant[];
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let product: Product;
  try {
    product = await serverGet<Product>(`/products/${params.id}`);
  } catch {
    return (
      <main className="mx-auto w-full max-w-7xl flex-grow px-space-lg py-space-xl md:px-margin">
        <p className="text-on-surface-variant">Product not found.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-body-sm text-primary underline underline-offset-4"
        >
          Back to home
        </Link>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-grow px-space-lg py-space-xl md:px-margin">
        <p className="text-on-surface-variant">Product not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-grow px-space-lg pb-space-xl pt-space-md md:px-margin">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 py-space-md text-label-md font-label-md text-on-surface-variant"
      >
        <Link href="/" className="transition-colors hover:text-primary">
          Home
        </Link>
        <span className="text-outline-variant">/</span>
        <Link
          href="/#new-arrivals"
          className="transition-colors hover:text-primary"
        >
          New Arrivals
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="font-medium text-primary">{product.name}</span>
      </nav>

      <div className="mt-space-sm grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12 lg:gap-gutter">
        <div className="flex flex-col gap-space-md lg:col-span-7">
          <div className="group relative aspect-[3/4] overflow-hidden border border-surface-container-highest bg-surface-container-low">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#efeae1] to-[#d6c4ad] text-outline-variant">
                <span className="material-symbols-outlined text-[56px]">
                  checkroom
                </span>
              </div>
            )}
            <div className="absolute left-space-md top-space-md border border-surface-container-highest bg-surface/95 px-2.5 py-1 shadow-sm backdrop-blur-sm">
              <span className="text-label-sm font-label-sm uppercase tracking-wider text-secondary">
                Atelier Archive · 2024
              </span>
            </div>
          </div>

          <div className="mt-space-xs flex items-start gap-space-md border border-surface-container-highest bg-surface-container-low p-space-md">
            <span className="material-symbols-outlined mt-0.5 text-[24px] text-secondary">
              eco
            </span>
            <div>
              <h4 className="text-label-md font-label-md uppercase tracking-wide text-primary">
                Hand-finished in our Myanmar atelier
              </h4>
              <p className="mt-0.5 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                Every piece is assembled in small batches by master tailors,
                using natural botanical pre-softeners for immediate softness
                without harsh chemical treatments.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <ProductPurchase product={product} />
        </div>
      </div>
    </main>
  );
}
