import { HomeView } from "@/components/HomeView";
import { getCategories, getConfig, getProducts } from "@/lib/api";

// Static page, refreshed in the background every minute.
export const revalidate = 60;

export default async function HomePage() {
  const [featured, categories, config] = await Promise.all([
    getProducts({ featured: true }),
    getCategories(),
    getConfig(),
  ]);

  return <HomeView featured={featured} categories={categories} config={config} />;
}
