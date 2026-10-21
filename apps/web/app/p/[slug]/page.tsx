import { notFound } from "next/navigation";
import { ProductView } from "@/components/ProductView";
import { getConfig, getProduct, getSizeChart } from "@/lib/api";

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
