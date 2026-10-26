import { SearchView } from "@/components/SearchView";
import { getProducts } from "@/lib/api";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await getProducts({});

  return <SearchView products={products} initialQuery={q ?? ""} />;
}
