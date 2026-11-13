import { appBaseUrl } from "@/lib/app-url";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  if (new URL(appBaseUrl).hostname === "localhost") {
    console.warn("NEXT_PUBLIC_APP_URL masih localhost pada mode produksi; QR akan mengarah ke alamat yang tidak dapat diakses publik.");
  }
  if (!process.env.IP_HASH_SECRET || process.env.IP_HASH_SECRET.length < 32) {
    console.warn("IP_HASH_SECRET belum terpasang dengan panjang minimal 32 karakter; ipHash dan deduplikasi scan dinonaktifkan.");
  }
}
