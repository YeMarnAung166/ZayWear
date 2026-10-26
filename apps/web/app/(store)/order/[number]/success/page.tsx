"use client";

import { useParams } from "next/navigation";
import { OrderSuccess } from "@/components/OrderSuccess";

export default function OrderSuccessPage() {
  const params = useParams<{ number: string }>();

  return <OrderSuccess orderNumber={params.number} />;
}
