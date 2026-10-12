"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PortalCustomerDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.customerId as string;

  useEffect(() => {
    if (customerId) {
      router.replace(`/customer/${customerId}`);
    } else {
      router.replace("/customer");
    }
  }, [customerId, router]);

  return (
    <div className="py-24 text-center text-slate-400 text-xs font-semibold">
      Redirecting to Customer Portal...
    </div>
  );
}
