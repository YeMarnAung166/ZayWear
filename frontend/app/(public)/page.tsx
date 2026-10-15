import Link from "next/link";
import Image from "next/image";

import { serverGet } from "@/lib/server";

interface Product {
  id: number;
  name: string;
  base_price: string;
  image_url: string | null;
}

function formatMmk(value: string | number): string {
  return `${new Intl.NumberFormat("en-US").format(Number(value))} MMK`;
}

export default async function HomePage() {
  let products: Product[] = [];
  try {
    products = await serverGet<Product[]>("/products");
  } catch {
    products = [];
  }

  return (
    <div>
      <section className="mb-12 border-b border-hairline pb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-terracotta">
          New Arrivals
        </p>
        <h1 className="max-w-2xl text-4xl font-normal leading-tight tracking-tight sm:text-5xl">
          Effortless everyday wear, made for Myanmar.
        </h1>
      </section>

      <h2 className="mb-6 text-xl font-medium">New Arrivals</h2>
      {products.length === 0 ? (
        <p className="text-taupe">No products available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-raised">
                {product.image_url && (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="mt-3">
                <p className="text-[15px]">{product.name}</p>
                <p className="text-sm font-medium text-soot">
                  {formatMmk(product.base_price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
