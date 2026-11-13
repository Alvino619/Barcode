import { beforeEach, expect, it, vi } from "vitest";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { invalidatePublicPage } from "@/server/public-cache";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { page: { findUnique: vi.fn() } } }));
beforeEach(() => vi.clearAllMocks());
it("membatalkan cache slug aktif, semua alias, dan 404 terdahulu", async () => {
  const page = { id: "id", ownerId: "u", title: "Tes", description: null, logo: null, coverImage: null, isPublished: true, theme: {}, createdAt: new Date(), updatedAt: new Date(), slug: "baru", slugHistory: [{ slug: "lama" }, { slug: "tertua" }] };
  vi.mocked(prisma.page.findUnique).mockResolvedValue(page);
  await invalidatePublicPage(page.id, ["lama"]);
  expect(revalidatePath).toHaveBeenCalledTimes(3);
  for (const slug of ["baru", "lama", "tertua"]) {
    expect(revalidatePath).toHaveBeenCalledWith(`/p/${slug}`);
    expect(revalidateTag).toHaveBeenCalledWith(`public-slug:${slug}`);
  }
});
it("penghapusan tetap menginvalidasi alias setelah cascade tanpa query halaman", async () => {
  await invalidatePublicPage(null, ["baru", "lama"]);
  expect(prisma.page.findUnique).not.toHaveBeenCalled();
  expect(revalidatePath).toHaveBeenCalledWith("/p/lama");
});
