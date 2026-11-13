import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { slugQuerySchema } from "@/lib/schemas/page";
import { apiError } from "@/server/http";
import { assertCanManagePage } from "@/server/page-access";
import { isSlugAvailable } from "@/server/pages";

export async function GET(request: Request) {
  const user = await requireUser();
  try {
    const input = slugQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    await assertCanManagePage(user, input.pageId ?? null);
    return NextResponse.json({ available: await isSlugAvailable(input.slug, input.pageId) });
  } catch (error) { return apiError(error); }
}
