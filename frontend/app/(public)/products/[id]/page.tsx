import Image from "next/image";
import { notFound } from "next/navigation";

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
    return <p className="text-taupe">Product not found.</p>;
  }

  if (!product) return <p className="text-taupe">Product not found.</p>;

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-raised">
        {product.image_url && (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      <div>
        <ProductPurchase product={product} />
      </div>
    </div>
  );
}
