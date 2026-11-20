import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireUser } from "@/server/auth";
import { assertCanManagePage } from "@/server/page-access";
import { pageTransaction } from "@/server/page-transactions";
import { apiError, assertSameOrigin, readJson, readLimitedBody } from "@/server/http";
import { AppError } from "@/server/errors";
import { deleteUploadSchema, uploadContextSchema } from "@/lib/schemas/page";
import { getStorage } from "@/lib/storage";
import { MAX_IMAGE_SIZE, uploadFileSchema, validateImageBytes } from "@/lib/upload";
import { claimImageDeletion, finalizeImageDeletion } from "@/server/images";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new AppError(415, "Unggah file melalui formulir gambar.");
    // Enforce actual streamed size, not just a client-controlled Content-Length.
    const bytes = await readLimitedBody(request, MAX_IMAGE_SIZE + 64 * 1024);
    let form: FormData;
    try { form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
    catch { throw new AppError(400, "Formulir unggahan tidak valid."); }
    const context = uploadContextSchema.parse({ pageId: form.get("pageId") ?? undefined });
    const file = uploadFileSchema.parse(form.get("file"));
    const data = new Uint8Array(await file.arrayBuffer());
    try { validateImageBytes(data); }
    catch { throw new AppError(400, "Isi file harus JPEG, PNG, atau WebP maksimal 5 MB. SVG tidak diizinkan."); }
    await assertCanManagePage(user, context.pageId ?? null);
    let processed: Buffer;
    try {
      processed = await sharp(data).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch { throw new AppError(400, "Isi file harus JPEG, PNG, atau WebP maksimal 5 MB. SVG tidak diizinkan."); }
    const storage = getStorage();
    const image = await storage.save(processed, "webp");
    try {
      await pageTransaction(async (tx) => {
        await assertCanManagePage(user, context.pageId ?? null, tx);
        await tx.uploadedImage.create({ data: { ...image, ownerId: user.id, sourcePageId: context.pageId ?? null } });
      });
    } catch (error) { await storage.delete(image.key); throw error; }
    return NextResponse.json({ url: image.url }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    const input = deleteUploadSchema.parse(await readJson(request));
    const marker = await pageTransaction(async (tx) => {
      await assertCanManagePage(user, input.pageId ?? null, tx);
      const image = await tx.uploadedImage.findUnique({ where: { url: input.url } });
      if (!image) return null;
      if (image.ownerId !== user.id && user.role !== "ADMIN") throw new AppError(403, "Unggahan ini bukan milik Anda.");
      return claimImageDeletion(tx, image);
    });
    const deleted = marker ? await finalizeImageDeletion(marker) : false;
    return NextResponse.json({ deleted });
  } catch (error) { return apiError(error); }
}
