export interface StatusMeta {
  label: string;
  className: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  pending: {
    label: "Awaiting payment",
    className: "border-secondary/40 bg-secondary/10 text-secondary",
  },
  slip_uploaded: {
    label: "Slip under review",
    className: "border-[#8a6d00]/40 bg-[#ffcb05]/20 text-[#544600]",
  },
  pending_cod: {
    label: "Awaiting dispatch",
    className:
      "border-outline-variant/60 bg-surface-container text-on-surface",
  },
  paid: {
    label: "Payment verified",
    className: "border-[#10539b]/30 bg-[#10539b]/10 text-[#10539b]",
  },
  dispatched: {
    label: "Dispatched",
    className: "border-[#6d4c00]/30 bg-[#ffb95f]/20 text-[#633f00]",
  },
  delivered: {
    label: "Delivered",
    className: "border-[#1b6b34]/30 bg-[#8fd6a3]/30 text-[#0d4d21]",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-outline-variant/50 bg-surface-container text-on-surface-variant",
  },
  requested: {
    label: "Requested",
    className: "border-secondary/40 bg-secondary/10 text-secondary",
  },
  approved: {
    label: "Approved",
    className: "border-[#1b6b34]/30 bg-[#8fd6a3]/30 text-[#0d4d21]",
  },
  rejected: {
    label: "Rejected",
    className: "border-error/40 bg-error-container/40 text-on-error-container",
  },
  completed: {
    label: "Completed",
    className: "border-[#10539b]/30 bg-[#10539b]/10 text-[#10539b]",
  },
};

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status.replace(/_/g, " "),
      className:
        "border-outline-variant/50 bg-surface-container text-on-surface-variant",
    }
  );
}

export default function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-label-sm font-label-sm uppercase tracking-wider ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
