import {
  ORDER_STATUS_LABELS,
  REFUSAL_REASON_LABELS,
} from "@/lib/order-status";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Yangon",
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Asia/Yangon",
});

export function formatAdminDateTime(value: string | null): string {
  return value ? dateTime.format(new Date(value)) : "—";
}

export function formatAdminDate(value: string | null): string {
  return value ? dateOnly.format(new Date(value)) : "—";
}

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status]?.en ?? status;
}

export function refusalLabel(reason: string): string {
  return REFUSAL_REASON_LABELS[reason]?.en ?? reason;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatHours(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} h`;
}
