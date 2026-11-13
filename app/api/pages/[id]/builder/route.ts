import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiError, assertSameOrigin, readJson } from "@/server/http";
import { loadBuilder, saveBuilder, VersionConflict } from "@/server/builder";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const user = await requireUser();
  try { return NextResponse.json(await loadBuilder(user, (await params).id)); }
  catch (error) { return apiError(error); }
}
export async function PUT(request: Request, { params }: Context) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    return NextResponse.json(await saveBuilder(user, (await params).id, await readJson(request, 2 * 1024 * 1024)));
  } catch (error) {
    if (error instanceof VersionConflict) return NextResponse.json({ error: error.message, code: "VERSION_CONFLICT", updatedAt: error.updatedAt }, { status: 409 });
    return apiError(error);
  }
}
