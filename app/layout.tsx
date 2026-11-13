import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import "@/lib/app-url";

export const metadata: Metadata = {
  title: "QR Card Page",
  description: "Kumpulan informasi dalam satu halaman QR.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" className={fontVariables}><body className="min-h-screen font-sans">{children}</body></html>;
}
