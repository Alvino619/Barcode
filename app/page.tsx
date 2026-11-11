import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">QR Card Page</p>
      <h1 className="text-4xl font-bold tracking-tight">Satu halaman untuk informasi Anda.</h1>
      <p className="text-muted-foreground">Fondasi aplikasi sudah siap. Masuk untuk mengakses area pengelola.</p>
      <Button asChild className="self-start"><Link href="/admin">Masuk pengelola</Link></Button>
    </main>
  );
}
