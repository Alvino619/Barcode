"use client";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { reset: () => void }) {
  return <div role="alert" className="rounded-2xl border bg-white p-8"><h1 className="text-xl font-semibold">Halaman belum dapat dimuat</h1><p className="my-4 text-muted-foreground">Periksa koneksi dan pastikan migrasi database terbaru sudah diterapkan.</p><Button onClick={reset}>Coba lagi</Button></div>;
}
