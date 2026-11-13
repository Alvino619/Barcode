import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiError, assertSameOrigin, readJson } from "@/server/http";
import { createPage, listPages } from "@/server/pages";

export async function GET(request: Request) {
  const user = await requireUser();
  try { return NextResponse.json(await listPages(user, Object.fromEntries(new URL(request.url).searchParams))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    const page = await createPage(user, await readJson(request));
    return NextResponse.json({ id: page.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
