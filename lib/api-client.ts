export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  if (response.redirected || response.headers.get("content-type")?.includes("text/html")) {
    throw new Error("Sesi berakhir. Muat ulang halaman dan masuk kembali.");
  }
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Permintaan gagal. Silakan coba lagi.";
    throw new Error(message);
  }
  return data as T;
}
