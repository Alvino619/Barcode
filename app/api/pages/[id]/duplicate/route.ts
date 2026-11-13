import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiError, assertSameOrigin } from "@/server/http";
import { duplicatePage } from "@/server/pages";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    assertSameOrigin(request);
    const page = await duplicatePage(user, (await context.params).id);
    return NextResponse.json({ id: page.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
