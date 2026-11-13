import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiError, assertSameOrigin, readJson } from "@/server/http";
import { deletePage, updatePage } from "@/server/pages";
import { assertCanManagePage } from "@/server/page-access";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const user = await requireUser();
  try { return NextResponse.json(await assertCanManagePage(user, (await context.params).id)); }
  catch (error) { return apiError(error); }
}
export async function PATCH(request: Request, context: Context) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    const page = await updatePage(user, (await context.params).id, await readJson(request));
    return NextResponse.json({ id: page.id });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    await deletePage(user, (await context.params).id, await readJson(request));
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
