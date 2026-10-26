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
