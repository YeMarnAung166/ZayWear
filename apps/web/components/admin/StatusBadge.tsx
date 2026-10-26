import { ORDER_STATUS_TONES } from "@/lib/order-status";
import { statusLabel } from "@/lib/admin/format";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        ORDER_STATUS_TONES[status] ?? "bg-neutral-50 text-neutral-500"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}
