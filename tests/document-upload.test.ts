import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import * as CFB from "cfb";
import { validateDocumentBytes, MAX_DOCUMENT_SIZE } from "@/server/document-upload";

describe("signature dokumen", () => {
  it("mengenali PDF dan menolak file palsu", () => {
    expect(validateDocumentBytes(Buffer.from("%PDF-1.7\n1 0 obj\nendobj\n%%EOF"))).toBe("pdf");
    for (const value of ["<html>pdf</html>", "<svg/>", "%PDF-1.7 truncated", "PK fake docx"]) expect(() => validateDocumentBytes(Buffer.from(value))).toThrow();
    expect(() => validateDocumentBytes(new Uint8Array(MAX_DOCUMENT_SIZE + 1))).toThrow();
  });
  it("memeriksa isi ZIP OOXML, bukan ekstensi atau signature ZIP saja", () => {
    const docx = zipSync({ "[Content_Types].xml": strToU8("<Types>wordprocessingml.document.main+xml</Types>"), "word/document.xml": strToU8("<document/>") });
    const xlsx = zipSync({ "[Content_Types].xml": strToU8("<Types>spreadsheetml.sheet.main+xml</Types>"), "xl/workbook.xml": strToU8("<workbook/>") });
    expect(validateDocumentBytes(docx)).toBe("docx"); expect(validateDocumentBytes(xlsx)).toBe("xlsx");
    expect(() => validateDocumentBytes(zipSync({ "hello.txt": strToU8("bukan Office") }))).toThrow();
    expect(() => validateDocumentBytes(zipSync({ "[Content_Types].xml": strToU8("macroEnabled"), "word/vbaProject.bin": strToU8("macro") }))).toThrow();
    expect(() => validateDocumentBytes(zipSync({ "[Content_Types].xml": new Uint8Array(65537) }))).toThrow();
  });
  it("membedakan DOC dan XLS melalui stream CFB", () => {
    for (const [stream, expected] of [["WordDocument", "doc"], ["Workbook", "xls"]]) {
      const file = CFB.utils.cfb_new(); CFB.utils.cfb_add(file, stream, Buffer.from("fixture"));
      expect(validateDocumentBytes(CFB.write(file, { type: "buffer" }))).toBe(expected);
    }
    const other = CFB.utils.cfb_new(); CFB.utils.cfb_add(other, "PowerPoint Document", Buffer.from("fixture"));
    expect(() => validateDocumentBytes(CFB.write(other, { type: "buffer" }))).toThrow();
  });
});
