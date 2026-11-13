import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { AppError } from "./errors";

// Cookie-authenticated mutations must originate from this application.
export function assertSameOrigin(request: Request) {
  const expected = new URL(process.env.NEXTAUTH_URL ?? request.url).origin;
  if (request.headers.get("origin") !== expected) throw new AppError(403, "Asal permintaan tidak diizinkan.");
}

export async function readJson(request: Request, limit = 32 * 1024): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AppError(415, "Permintaan harus berupa JSON.");
  const bytes = await readLimitedBody(request, limit);
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new AppError(400, "Format JSON tidak valid."); }
}

export async function readLimitedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) throw new AppError(413, "Ukuran unggahan terlalu besar.");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Permintaan kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new AppError(413, "Ukuran unggahan terlalu besar."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export function apiError(error: unknown) {
  if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
    return NextResponse.json({ error: "Data berubah atau slug sudah digunakan. Muat ulang dan coba lagi." }, { status: 409 });
  }
  console.error("Operasi halaman gagal", error);
  return NextResponse.json({ error: "Terjadi kesalahan server. Silakan coba lagi." }, { status: 500 });
}
