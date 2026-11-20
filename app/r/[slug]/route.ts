import { after } from "next/server";
import { slugSchema } from "@/lib/schemas/page";
import { recordScan, resolvePublishedSlug } from "@/server/scans";
import { isPageExpired } from "@/server/page-access";

type RouteContext = { params: Promise<{ slug: string }> };

// Relative Location keeps the public origin when a proxy exposes an internal request URL.
function redirectToPath(path: string) {
  return new Response(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store" } });
}

async function redirect(request: Request, { params }: RouteContext, countScan: boolean) {
  const parsed = slugSchema.safeParse((await params).slug);
  if (!parsed.success) return redirectToPath("/not-found");

  let target: Awaited<ReturnType<typeof resolvePublishedSlug>>;
  try {
    target = await resolvePublishedSlug(parsed.data);
  } catch (error) {
    console.error("Gagal mencari tujuan QR", error);
    return redirectToPath("/not-found");
  }
  if (!target) return redirectToPath("/not-found");

  if (countScan) {
    after(async () => {
      if (isPageExpired(target.expiresAt)) return;
      try { await recordScan(target.pageId, request); }
      catch (error) { console.error("Gagal mencatat scan QR", error); }
    });
  }
  return redirectToPath(`/p/${encodeURIComponent(target.latestSlug)}`);
}

export async function GET(request: Request, context: RouteContext) {
  return redirect(request, context, true);
}

export async function HEAD(request: Request, context: RouteContext) {
  return redirect(request, context, false);
}
