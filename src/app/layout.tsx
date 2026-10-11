import type { Metadata } from "next";
import "./globals.css";
import AppLayoutShell from "@/components/layout/AppLayoutShell";

export const metadata: Metadata = {
  title: "KB AI Assistant | Smart Conversational Intelligence",
  description: "Minimal, elegant AI conversational assistant powered by Google Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased overflow-x-hidden">
        <AppLayoutShell>{children}</AppLayoutShell>
      </body>
    </html>
  );
}
