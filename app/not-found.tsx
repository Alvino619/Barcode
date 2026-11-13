import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-lg space-y-4 px-6 py-20"><h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1><p className="text-muted-foreground">Alamat ini belum tersedia. Periksa kembali tautannya atau kembali ke beranda.</p><Link href="/" className="inline-block rounded px-2 py-3 text-primary underline focus-visible:outline focus-visible:outline-2">Kembali ke beranda</Link></main>;
}
