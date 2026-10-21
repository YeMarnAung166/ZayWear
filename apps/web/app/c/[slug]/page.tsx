import { notFound } from "next/navigation";
import { CategoryView } from "@/components/CategoryView";
import { getCategories, getProducts } from "@/lib/api";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [products, categories] = await Promise.all([
    getProducts({ category: slug }),
    getCategories(),
  ]);

  const category = categories.find((item) => item.slug === slug);

  if (!category && slug !== "men" && slug !== "women") {
    notFound();
  }

  return (
    <CategoryView
      products={products}
      titleMm={category?.name_mm ?? slug}
      titleEn={category?.name_en ?? slug}
    />
  );
}
