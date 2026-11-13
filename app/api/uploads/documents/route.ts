import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { assertCanManagePage } from "@/server/page-access";
import { pageTransaction } from "@/server/page-transactions";
import { assertSameOrigin, readLimitedBody, apiError } from "@/server/http";
import { AppError } from "@/server/errors";
import { documentFileSchema, validateDocumentBytes, MAX_DOCUMENT_SIZE } from "@/server/document-upload";
import { pageIdSchema } from "@/lib/schemas/page";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    const type = request.headers.get("content-type");
    if (!type?.startsWith("multipart/form-data;")) throw new AppError(415, "Gunakan formulir upload dokumen.");
    const bytes = await readLimitedBody(request, MAX_DOCUMENT_SIZE + 64 * 1024);
    let form;
    try { form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": type } }).formData(); }
    catch { throw new AppError(400, "Formulir tidak valid."); }
    const pageId = pageIdSchema.parse(form.get("pageId"));
    await assertCanManagePage(user, pageId);
    const file = documentFileSchema.parse(form.get("file"));
    const data = new Uint8Array(await file.arrayBuffer());
    let extension;
    try { extension = validateDocumentBytes(data); }
    catch { throw new AppError(400, "Isi dokumen tidak valid. Gunakan PDF/DOC/DOCX/XLS/XLSX maksimal 10 MB tanpa makro OOXML."); }
    const storage = getStorage();
    const saved = await storage.save(data, extension);
    try {
      await pageTransaction(async (tx) => {
        await assertCanManagePage(user, pageId, tx);
        await tx.uploadedImage.create({ data: { ...saved, ownerId: user.id } });
      });
    } catch (error) { await storage.delete(saved.key); throw error; }
    return NextResponse.json({ url: saved.url, fileName: `dokumen.${extension}` }, { status: 201 });
  } catch (error) { return apiError(error); }
}
