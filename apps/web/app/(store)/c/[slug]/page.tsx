import { notFound } from "next/navigation";
import { CategoryView } from "@/components/CategoryView";
import { getCategories, getProducts } from "@/lib/api";

// Static page, refreshed in the background every minute.
export const revalidate = 60;

export async function generateStaticParams() {
  const categories = await getCategories();

  return categories.map((category) => ({ slug: category.slug }));
}

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
