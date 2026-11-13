import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadKeySchema } from "@/lib/schemas/page";

// Serve files created AFTER next build, including on a running next start server.
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = uploadKeySchema.safeParse((await params).key);
  if (!key.success) return new Response("Gambar tidak ditemukan.", { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "uploads", key.data));
    const extension = key.data.split(".").pop() ?? "";
    const types: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    const isImage = ["jpg", "png", "webp"].includes(extension);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": types[extension] ?? "application/octet-stream",
      ...(isImage ? {} : { "Content-Disposition": `attachment; filename="dokumen.${extension}"` }),
      "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable",
    } });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return new Response("Gambar tidak ditemukan.", { status: 404 });
    return new Response("Gambar belum dapat dimuat.", { status: 500 });
  }
}
