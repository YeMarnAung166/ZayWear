export type Locale = "my" | "en";

export type Variant = {
  id: number;
  size: string;
  color: string;
  color_hex: string;
  stock_qty: number;
  price_mmk: number;
  is_active: boolean;
};

export type ProductImage = {
  path: string;
  alt_mm: string;
  alt_en: string;
  is_primary: boolean;
};

export type Product = {
  id: number;
  slug: string;
  name_mm: string;
  name_en: string;
  description_mm: string | null;
  description_en: string | null;
  fabric_care_mm: string | null;
  fabric_care_en: string | null;
  price_mmk: number;
  compare_at_price_mmk: number | null;
  is_featured: boolean;
  category: { slug: string; name_mm: string; name_en: string } | null;
  images: ProductImage[];
  variants: Variant[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  in_stock: boolean;
};

export type Category = {
  id: number;
  slug: string;
  name_mm: string;
  name_en: string;
  sort_order: number;
};

export type Township = {
  id: number;
  region: string;
  name_mm: string;
  name_en: string;
  delivery_fee_mmk: number;
};

export type ShopConfig = {
  currency: string;
  free_delivery_threshold_mmk: number;
  cod_enabled: boolean;
  kbzpay_enabled: boolean;
  wave_enabled: boolean;
  kbzpay_account_name: string;
  kbzpay_phone: string;
  wave_account_name: string;
  wave_phone: string;
  return_window_days: number;
  support_telegram: string;
  telegram_bot: string;
};

export type PaymentInstructions = {
  account_name: string;
  phone: string;
  reference: string;
};

export type PaymentProofSummary = {
  id: number;
  status: string;
  source: string;
  created_at: string | null;
};

/** Public payment details behind a signed tracking link. */
export type OrderPayment = {
  method: string;
  status: string;
  total_mmk: number;
  is_prepaid: boolean;
  instructions: PaymentInstructions | null;
  telegram_url: string | null;
  proofs: PaymentProofSummary[];
  rejection_reason: string | null;
  can_upload: boolean;
};

export type SizeChart = {
  title_mm: string;
  title_en: string;
  rows: Record<string, string | number>[];
};

export type OrderItem = {
  product_name_mm: string;
  product_name_en: string;
  size: string;
  color: string;
  unit_price_mmk: number;
  qty: number;
  line_total_mmk: number;
};

export type OrderEvent = {
  from: string | null;
  to: string;
  actor: string;
  reason: string | null;
  at: string | null;
};

export type Order = {
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  placed_via: string;
  subtotal_mmk: number;
  delivery_fee_mmk: number;
  discount_mmk: number;
  total_mmk: number;
  township?: { name_mm: string; name_en: string; region: string } | null;
  address_line: string;
  landmark: string;
  note: string | null;
  customer?: { name: string; phone: string } | null;
  items: OrderItem[];
  events?: OrderEvent[];
  shipment?: { carrier: string; tracking_number: string | null } | null;
  refusal_reason: string | null;
  created_at: string | null;
  delivered_at: string | null;
};

/** The public tracking payload is deliberately smaller than `Order`. */
export type TrackingEvent = {
  to: string;
  at: string | null;
};

export type TrackingOrder = {
  order_number: string;
  status: string;
  events?: TrackingEvent[];
  shipment?: { carrier: string; tracking_number: string | null } | null;
  refusal_reason: string | null;
  created_at: string | null;
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page?: number;
    total: number;
  };
  links?: unknown;
};

export type CustomerAddress = {
  id: number;
  label: string;
  township: {
    id: number;
    name_mm: string;
    name_en: string;
    region: string;
    delivery_fee_mmk: number;
  } | null;
  address_line: string;
  landmark: string;
  is_default: boolean;
};

export type CustomerAccount = {
  id: number;
  name: string;
  phone: string;
  telegram_linked: boolean;
  phone_verified_at: string | null;
  last_login_at: string | null;
  addresses: CustomerAddress[];
  created_at: string | null;
};

export type ReorderResult = {
  lines: {
    variantId: number;
    productId: number;
    productSlug: string;
    name_mm: string;
    name_en: string;
    size: string;
    color: string;
    unitPrice: number;
    qty: number;
    requested_qty: number;
    image: string;
    maxQty: number;
  }[];
  unavailable: { name_mm: string; name_en: string; size: string }[];
};
