import { notFound } from "next/navigation";
import { ProductView } from "@/components/ProductView";
import { getConfig, getProduct, getProducts, getSizeChart } from "@/lib/api";

// Static page, refreshed in the background every minute.
export const revalidate = 60;

export async function generateStaticParams() {
  const products = await getProducts({});

  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const [sizeChart, config] = await Promise.all([getSizeChart(slug), getConfig()]);

  return <ProductView product={product} sizeChart={sizeChart} config={config} />;
}
