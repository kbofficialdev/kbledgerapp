"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootStoreHomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
