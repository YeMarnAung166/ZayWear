import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminApiError, adminFetch } from "@/lib/admin/api";

export const metadata: Metadata = {
  title: "Receipt",
};

/**
 * Receipts live in a private bucket. This route asks the API for a ten-minute
 * signed URL and sends the browser straight to it, so the storage credentials
 * never reach the client.
 */
export default async function AdminPaymentProofPage({
  params,
}: {
  params: Promise<{ id: string; proofId: string }>;
}) {
  const { proofId } = await params;
  const id = Number(proofId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let url = "";

  try {
    const body = await adminFetch<{ url: string }>(`/admin/payment-proofs/${id}/url`);
    url = body.url;
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  if (!url) {
    notFound();
  }

  redirect(url);
}
