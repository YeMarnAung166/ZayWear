export type AdminTownship = {
  name_mm: string;
  name_en: string;
  region: string;
};

export type AdminCustomer = {
  name: string | null;
  phone: string | null;
};

export type AdminOrderSummary = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  placed_via: string;
  subtotal_mmk: number;
  delivery_fee_mmk: number;
  discount_mmk: number;
  total_mmk: number;
  note: string | null;
  customer: AdminCustomer;
  township: AdminTownship | null;
  address_line: string;
  landmark: string;
  items_count: number;
  created_at: string | null;
  items: AdminOrderItem[];
  events: AdminOrderEvent[];
  shipment: AdminShipment | null;
  payments: AdminPayment[];
  payment_required_before_shipping: boolean;
  can_mark_paid: boolean;
  refusal_reason: string | null;
  cancel_reason: string | null;
  allowed_transitions: string[];
};

export type AdminOrderDetail = AdminOrderSummary;

export type AdminOrderItem = {
  name_mm: string;
  name_en: string;
  size: string;
  color: string;
  qty: number;
  unit_price_mmk: number;
  line_total_mmk: number;
};

export type AdminOrderEvent = {
  from: string | null;
  to: string;
  actor: string;
  reason: string | null;
  at: string | null;
};

export type AdminShipment = {
  carrier: string;
  tracking_number: string | null;
  cod_amount_mmk: number;
  dispatched_at: string | null;
  delivered_at: string | null;
};

export type AdminPaymentProof = {
  id: number;
  source: string;
  status: string;
  original_name: string | null;
  mime_type: string;
  size_bytes: number;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

export type AdminPayment = {
  id: number;
  provider: string;
  status: string;
  amount_mmk: number;
  provider_ref: string | null;
  paid_at: string | null;
  instructions: {
    account_name?: string;
    phone?: string;
    reference?: string;
  } | null;
  verification: {
    verified_by?: string;
    verified_at?: string;
    note?: string | null;
  } | null;
  proofs: AdminPaymentProof[];
};

export type AdminPaymentSettings = {
  cod_enabled: boolean;
  kbzpay_enabled: boolean;
  wave_enabled: boolean;
  kbzpay_account_name: string;
  kbzpay_phone: string;
  wave_account_name: string;
  wave_phone: string;
};

export type AdminOrderList = {
  data: AdminOrderSummary[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    status_counts: Record<string, number>;
  };
};

export type AdminMetrics = {
  orders_today: number;
  orders_7d: number;
  orders_30d: number;
  refusal_rate_30d: number | null;
  refusal_reasons_30d: Record<string, number>;
  median_delivery_hours: number | null;
  revenue_30d_mmk: number;
  status_counts: Record<string, number>;
};
