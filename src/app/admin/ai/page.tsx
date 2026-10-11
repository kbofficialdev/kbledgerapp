"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminAIAssistantPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/assistant");
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-zinc-950 text-zinc-500">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-900 dark:text-zinc-100" />
        <span className="text-xs font-mono">Opening KB AI Business Advisor...</span>
      </div>
    </div>
  );
}
