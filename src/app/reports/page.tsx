"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/reports");
  }, [router]);

  return (
    <div className="py-24 text-center text-slate-400 text-xs font-semibold">
      Redirecting to Carbon Reports Module...
    </div>
  );
}
