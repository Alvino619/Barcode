import { unzipSync, strFromU8 } from "fflate";
import * as CFB from "cfb";
import { z } from "zod";

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const documentFileSchema = z.instanceof(File).refine((file) => file.size > 0 && file.size <= MAX_DOCUMENT_SIZE, "Dokumen harus berukuran 1 byte hingga 10 MB.");
export function validateDocumentBytes(bytes: Uint8Array): "pdf" | "doc" | "docx" | "xls" | "xlsx" {
  if (!bytes.length || bytes.length > MAX_DOCUMENT_SIZE) throw new Error("Dokumen maksimal 10 MB.");
  const buffer = Buffer.from(bytes);
  if (buffer.subarray(0, 5).toString() === "%PDF-" && buffer.subarray(-1024).includes(Buffer.from("%%EOF"))) return "pdf";
  if (buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    const file = CFB.read(buffer, { type: "buffer" });
    const streams = file.FileIndex.filter((entry) => entry.type === 2 && entry.size > 0).map((entry) => entry.name);
    if (streams.includes("WordDocument")) return "doc";
    if (streams.includes("Workbook") || streams.includes("Book")) return "xls";
  }
  if (buffer.readUInt32LE(0) === 0x04034b50) {
    const names: string[] = [];
    let totalSize = 0;
    const files = unzipSync(bytes, { filter(entry) {
      totalSize += entry.originalSize;
      if (totalSize > 50 * 1024 * 1024 || names.length > 5000) throw new Error("Arsip dokumen terlalu besar.");
      names.push(entry.name);
      if (entry.name === "[Content_Types].xml") {
        if (entry.originalSize > 65536) throw new Error("Metadata dokumen terlalu besar.");
        return true;
      }
      return false;
    } });
    const types = files["[Content_Types].xml"] ? strFromU8(files["[Content_Types].xml"]) : "";
    if (/macroEnabled/i.test(types) || names.some((name) => /vbaProject/i.test(name))) throw new Error("Dokumen bermakro tidak diizinkan.");
    if (names.includes("word/document.xml") && types.includes("wordprocessingml.document.main+xml")) return "docx";
    if (names.includes("xl/workbook.xml") && types.includes("spreadsheetml.sheet.main+xml")) return "xlsx";
  }
  throw new Error("Isi file harus PDF, DOC, DOCX, XLS, atau XLSX yang valid.");
}
