import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertCanManagePage } from "@/server/page-access";

vi.mock("@/lib/prisma", () => ({ prisma: { page: { findUnique: vi.fn() } } }));
const id = "cm123456789012345678901234";
const page = { id, ownerId: "editor-1", title: "Halaman", slug: "halaman", description: null,
  isPublished: false, expiresAt: null, theme: {}, logo: null, coverImage: null, createdAt: new Date(), updatedAt: new Date() };

describe("assertCanManagePage", () => {
  beforeEach(() => { vi.mocked(prisma.page.findUnique).mockReset().mockResolvedValue(page); });
  it("ADMIN dapat mengelola halaman pengguna lain", async () => {
    await expect(assertCanManagePage({ id: "admin", role: "ADMIN" }, id)).resolves.toEqual(page);
  });
  it("EDITOR dapat mengelola halamannya sendiri", async () => {
    await expect(assertCanManagePage({ id: "editor-1", role: "EDITOR" }, id)).resolves.toEqual(page);
  });
  it("EDITOR ditolak pada halaman orang lain", async () => {
    await expect(assertCanManagePage({ id: "editor-2", role: "EDITOR" }, id)).rejects.toMatchObject({ status: 403 });
  });
  it("halaman hilang menghasilkan error terkontrol", async () => {
    vi.mocked(prisma.page.findUnique).mockResolvedValue(null);
    await expect(assertCanManagePage({ id: "admin", role: "ADMIN" }, id)).rejects.toMatchObject({ status: 404 });
  });
  it("halaman kedaluwarsa tidak dapat dikelola pemilik ataupun admin", async () => {
    vi.mocked(prisma.page.findUnique).mockResolvedValue({ ...page, expiresAt: new Date(0) });
    for (const role of ["ADMIN", "EDITOR"] as const) {
      await expect(assertCanManagePage({ id: page.ownerId, role }, id)).rejects.toMatchObject({ status: 404 });
    }
  });
  it("ID invalid ditolak sebelum query", async () => {
    await expect(assertCanManagePage({ id: "admin", role: "ADMIN" }, "../../secret")).rejects.toThrow();
    expect(prisma.page.findUnique).not.toHaveBeenCalled();
  });
  it("ADMIN dan EDITOR dapat membuat halaman baru", async () => {
    for (const role of ["ADMIN", "EDITOR"] as const) await expect(assertCanManagePage({ id: "user", role }, null)).resolves.toBeNull();
    expect(prisma.page.findUnique).not.toHaveBeenCalled();
  });
});
