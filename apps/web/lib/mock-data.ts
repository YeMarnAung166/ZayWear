import type { Category, Product, ShopConfig, Township } from "./types";

/**
 * Fallback preview data. The API (apps/api) is the source of truth.
 * Used only when NEXT_PUBLIC_API_URL is unreachable so the UI can be reviewed offline.
 */
const sizes = ["S", "M", "L", "XL"];

function variants(
  baseId: number,
  price: number,
  colors: { name: string; hex: string; stock: number[] }[],
) {
  return colors.flatMap((color, colorIndex) =>
    sizes.map((size, sizeIndex) => ({
      id: baseId + colorIndex * 10 + sizeIndex,
      size,
      color: color.name,
      color_hex: color.hex,
      stock_qty: color.stock[sizeIndex],
      price_mmk: price,
      is_active: true,
    })),
  );
}

export const mockCategories: Category[] = [
  { id: 1, slug: "men", name_mm: "အမျိုးသား", name_en: "Men", sort_order: 1 },
  { id: 2, slug: "women", name_mm: "အမျိုးသမီး", name_en: "Women", sort_order: 2 },
];

export const mockConfig: ShopConfig = {
  currency: "MMK",
  free_delivery_threshold_mmk: 80000,
  cod_enabled: true,
  kbzpay_enabled: false,
  wave_enabled: false,
  return_window_days: 7,
  support_telegram: "@zaywear_support",
  telegram_bot: "zaywear_mock_bot",
};

export const mockTownships: Township[] = [
  { id: 1, region: "Yangon", name_mm: "ကျောက်တံတား", name_en: "Kyauktada", delivery_fee_mmk: 1500 },
  { id: 5, region: "Yangon", name_mm: "စမ်းချောင်း", name_en: "Sanchaung", delivery_fee_mmk: 1500 },
  { id: 6, region: "Yangon", name_mm: "ဗဟန်း", name_en: "Bahan", delivery_fee_mmk: 1500 },
  { id: 13, region: "Yangon", name_mm: "လှိုင်", name_en: "Hlaing", delivery_fee_mmk: 1500 },
  { id: 19, region: "Mandalay", name_mm: "ချမ်းအေးသာဇံ", name_en: "Chanayethazan", delivery_fee_mmk: 1500 },
  { id: 20, region: "Mandalay", name_mm: "မဟာအောင်မြေ", name_en: "Mahaaungmyay", delivery_fee_mmk: 1500 },
  { id: 26, region: "Naypyidaw", name_mm: "ဇမ္ဗူသီရိ", name_en: "Zabuthiri", delivery_fee_mmk: 1500 },
  { id: 29, region: "Shan", name_mm: "တောင်ကြီး", name_en: "Taunggyi", delivery_fee_mmk: 2500 },
];

function product(input: {
  id: number;
  slug: string;
  name_mm: string;
  name_en: string;
  description_mm: string;
  description_en: string;
  fabric_mm: string;
  fabric_en: string;
  price: number;
  compare: number | null;
  featured: boolean;
  category: { slug: string; name_mm: string; name_en: string };
  image: string;
  colors: { name: string; hex: string; stock: number[] }[];
}): Product {
  const list = variants(input.id * 100, input.price, input.colors);

  return {
    id: input.id,
    slug: input.slug,
    name_mm: input.name_mm,
    name_en: input.name_en,
    description_mm: input.description_mm,
    description_en: input.description_en,
    fabric_care_mm: input.fabric_mm,
    fabric_care_en: input.fabric_en,
    price_mmk: input.price,
    compare_at_price_mmk: input.compare,
    is_featured: input.featured,
    category: input.category,
    images: [
      {
        path: input.image,
        alt_mm: input.name_mm,
        alt_en: input.name_en,
        is_primary: true,
      },
    ],
    variants: list,
    sizes,
    colors: input.colors.map((c) => ({ name: c.name, hex: c.hex })),
    in_stock: list.some((v) => v.stock_qty > 0),
  };
}

const men = { slug: "men", name_mm: "အမျိုးသား", name_en: "Men" };
const women = { slug: "women", name_mm: "အမျိုးသမီး", name_en: "Women" };

export const mockProducts: Product[] = [
  product({
    id: 1,
    slug: "basic-cotton-tee",
    name_mm: "ချည်သား တီရှပ်",
    name_en: "Basic Cotton Tee",
    description_mm: "နေ့စဉ်ဝတ်ဆင်နိုင်သော ချည်သား ၁၀၀% တီရှပ်။",
    description_en: "Everyday 100% cotton tee. Straight cut, soft hand feel.",
    fabric_mm: "ချည်သား ၁၀၀%။ အအေးရေဖြင့် လျှော်ပါ။",
    fabric_en: "100% cotton. Cold machine wash, dry in shade.",
    price: 18000,
    compare: null,
    featured: true,
    category: men,
    image: "tee-sand.svg",
    colors: [
      { name: "Sand", hex: "#D8C3A5", stock: [6, 14, 9, 0] },
      { name: "Black", hex: "#1A1A1A", stock: [4, 10, 0, 5] },
    ],
  }),
  product({
    id: 2,
    slug: "oxford-shirt",
    name_mm: "အောက်စဖို့ဒ် ရှပ်အင်္ကျီ",
    name_en: "Oxford Shirt",
    description_mm: "ရုံးဝတ်ရန် သင့်တော်သော အောက်စဖို့ဒ် ရှပ်အင်္ကျီ။",
    description_en: "Office-ready oxford shirt with a single chest pocket.",
    fabric_mm: "ချည်သား ၉၈%၊ စပန်းဒက်စ် ၂%။",
    fabric_en: "98% cotton, 2% elastane. Gentle wash.",
    price: 42000,
    compare: 49000,
    featured: true,
    category: men,
    image: "oxford-white.svg",
    colors: [
      { name: "White", hex: "#FAFAFA", stock: [5, 11, 7, 2] },
      { name: "Blue", hex: "#7FA8C9", stock: [3, 8, 4, 0] },
    ],
  }),
  product({
    id: 3,
    slug: "cargo-pants",
    name_mm: "ကားဂိုး ဘောင်းဘီ",
    name_en: "Cargo Pants",
    description_mm: "ဘေးအိတ်ကပ်များပါသော ခိုင်ခံ့သည့် ကားဂိုး ဘောင်းဘီ။",
    description_en: "Hard-wearing cargo pants with side pockets.",
    fabric_mm: "ချည်သား ၁၀၀%။",
    fabric_en: "100% cotton twill. Machine wash cold.",
    price: 38000,
    compare: null,
    featured: false,
    category: men,
    image: "cargo-olive.svg",
    colors: [
      { name: "Olive", hex: "#5A6247", stock: [4, 9, 6, 3] },
      { name: "Black", hex: "#1A1A1A", stock: [2, 7, 5, 1] },
    ],
  }),
  product({
    id: 4,
    slug: "linen-short-sleeve",
    name_mm: "လီနင် လက်တို အင်္ကျီ",
    name_en: "Linen Short Sleeve",
    description_mm: "ပူသောရာသီအတွက် လီနင်လက်တို အင်္ကျီ။",
    description_en: "Breathable linen shirt built for the hot season.",
    fabric_mm: "လီနင် ၅၅%၊ ချည်သား ၄၅%။",
    fabric_en: "55% linen, 45% cotton.",
    price: 29000,
    compare: null,
    featured: false,
    category: men,
    image: "linen-blue.svg",
    colors: [
      { name: "Sky", hex: "#A8C8DC", stock: [7, 12, 8, 4] },
      { name: "Sand", hex: "#D8C3A5", stock: [5, 6, 0, 2] },
    ],
  }),
  product({
    id: 5,
    slug: "cotton-blouse",
    name_mm: "ချည်သား အင်္ကျီ",
    name_en: "Cotton Blouse",
    description_mm: "ချည်သားဖြင့် ချုပ်ထားသော နူးညံ့သည့် အင်္ကျီ။",
    description_en: "Soft cotton blouse with a gathered neckline.",
    fabric_mm: "ချည်သား ၁၀၀%။",
    fabric_en: "100% cotton. Hand wash cold.",
    price: 26000,
    compare: null,
    featured: true,
    category: women,
    image: "blouse-cream.svg",
    colors: [{ name: "Cream", hex: "#EFE6D8", stock: [6, 10, 7, 2] }],
  }),
  product({
    id: 6,
    slug: "midi-dress",
    name_mm: "အလယ်အလတ် ဂါဝန်",
    name_en: "Midi Dress",
    description_mm: "ဒူးအောက်အထိ ရှည်သော ဂါဝန်။",
    description_en: "Midi-length dress with a tie waist.",
    fabric_mm: "ဗစ်ကို့စ် ၇၀%၊ လီနင် ၃၀%။",
    fabric_en: "70% viscose, 30% linen.",
    price: 45000,
    compare: 55000,
    featured: true,
    category: women,
    image: "midi-terracotta.svg",
    colors: [{ name: "Terracotta", hex: "#B4553C", stock: [3, 8, 5, 1] }],
  }),
  product({
    id: 7,
    slug: "wide-leg-pants",
    name_mm: "ခြေကျယ် ဘောင်းဘီ",
    name_en: "Wide Leg Pants",
    description_mm: "ခြေကျယ်ပုံစံ ဘောင်းဘီ။",
    description_en: "Wide leg trousers with an elasticated waist.",
    fabric_mm: "ပိုလီအက်စတာ ၈၀%၊ ချည်သား ၂၀%။",
    fabric_en: "80% polyester, 20% cotton.",
    price: 34000,
    compare: null,
    featured: false,
    category: women,
    image: "wideleg-charcoal.svg",
    colors: [{ name: "Charcoal", hex: "#3A3A3A", stock: [5, 9, 6, 2] }],
  }),
  product({
    id: 8,
    slug: "ribbed-long-sleeve",
    name_mm: "ရစ် လက်ရှည် အင်္ကျီ",
    name_en: "Ribbed Long Sleeve",
    description_mm: "ကိုယ်ထည်ကို ကပ်နေသော ရစ်ထည် လက်ရှည်။",
    description_en: "Body-skimming ribbed knit long sleeve.",
    fabric_mm: "ချည်သား ၉၂%၊ စပန်းဒက်စ် ၈%။",
    fabric_en: "92% cotton, 8% elastane.",
    price: 22000,
    compare: null,
    featured: true,
    category: women,
    image: "ribbed-black.svg",
    colors: [
      { name: "Black", hex: "#1A1A1A", stock: [8, 12, 7, 3] },
      { name: "Cream", hex: "#EFE6D8", stock: [4, 6, 2, 0] },
    ],
  }),
];
