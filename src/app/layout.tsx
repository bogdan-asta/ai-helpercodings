import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PromptCoach — тренажёр промптов",
  description: "Учись писать точные промпты для вайбкодинга с ИИ-репетитором.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body><AppShell>{children}<Toaster position="top-center" richColors /></AppShell></body>
    </html>
  );
}
