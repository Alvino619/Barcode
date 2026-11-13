import { NextResponse, after } from "next/server";
import { slugSchema } from "@/lib/schemas/page";
import { recordScan, resolvePublishedSlug } from "@/server/scans";

type RouteContext = { params: Promise<{ slug: string }> };

async function redirect(request: Request, { params }: RouteContext, countScan: boolean) {
  const parsed = slugSchema.safeParse((await params).slug);
  if (!parsed.success) return NextResponse.redirect(new URL("/not-found", request.url), 307);

  let target: Awaited<ReturnType<typeof resolvePublishedSlug>>;
  try {
    target = await resolvePublishedSlug(parsed.data);
  } catch (error) {
    console.error("Gagal mencari tujuan QR", error);
    return NextResponse.redirect(new URL("/not-found", request.url), 307);
  }
  if (!target) return NextResponse.redirect(new URL("/not-found", request.url), 307);

  if (countScan) {
    after(async () => {
      try { await recordScan(target.pageId, request); }
      catch (error) { console.error("Gagal mencatat scan QR", error); }
    });
  }
  return NextResponse.redirect(new URL(`/p/${target.latestSlug}`, request.url), 307);
}

export async function GET(request: Request, context: RouteContext) {
  return redirect(request, context, true);
}

export async function HEAD(request: Request, context: RouteContext) {
  return redirect(request, context, false);
}
