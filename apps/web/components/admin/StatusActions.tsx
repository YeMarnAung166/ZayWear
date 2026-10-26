import { updateStatusAction } from "@/lib/admin/actions";
import { REFUSAL_REASON_LABELS } from "@/lib/order-status";

const ACTION_LABELS: Record<string, string> = {
  confirmed: "Confirm order",
  packed: "Mark packed",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
  refused: "Mark refused",
  returned: "Mark returned",
};

const SECONDARY = new Set(["cancelled", "refused", "returned"]);

export function StatusActions({
  orderId,
  transitions,
}: {
  orderId: number;
  transitions: string[];
}) {
  if (transitions.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        This order has no further status changes.
      </p>
    );
  }

  const primary = transitions.filter((status) => !SECONDARY.has(status));
  const secondary = transitions.filter((status) => SECONDARY.has(status));

  return (
    <div className="space-y-3">
      {primary.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {primary.map((status) => (
            <form key={status} action={updateStatusAction}>
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
              >
                {ACTION_LABELS[status] ?? status}
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <div className="space-y-3 border-t border-neutral-200 pt-3">
          {secondary.includes("cancelled") ? (
            <form action={updateStatusAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="status" value="cancelled" />
              <div className="min-w-48 flex-1">
                <label
                  htmlFor={`cancel-reason-${orderId}`}
                  className="text-sm font-semibold"
                >
                  Cancellation reason (optional)
                </label>
                <input
                  id={`cancel-reason-${orderId}`}
                  name="reason"
                  maxLength={255}
                  className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-md border border-error-500 px-4 text-sm font-semibold text-error-500"
              >
                Cancel order
              </button>
            </form>
          ) : null}

          {secondary.includes("refused") ? (
            <form action={updateStatusAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="status" value="refused" />
              <div className="min-w-48 flex-1">
                <label
                  htmlFor={`refusal-reason-${orderId}`}
                  className="text-sm font-semibold"
                >
                  Refusal reason
                </label>
                <select
                  id={`refusal-reason-${orderId}`}
                  name="refusal_reason"
                  required
                  defaultValue=""
                  className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-sm"
                >
                  <option value="" disabled>
                    Choose a reason
                  </option>
                  {Object.entries(REFUSAL_REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label.en}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-md border border-error-500 px-4 text-sm font-semibold text-error-500"
              >
                Mark refused
              </button>
            </form>
          ) : null}

          {secondary.includes("returned") ? (
            <form action={updateStatusAction}>
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="status" value="returned" />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-md border border-neutral-200 px-4 text-sm font-semibold text-neutral-900"
              >
                Mark returned
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
