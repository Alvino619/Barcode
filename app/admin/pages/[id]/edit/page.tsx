import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { loadBuilder } from "@/server/builder";
import { AppError } from "@/server/errors";
import { pageIdSchema } from "@/lib/schemas/page";
import { CardBuilder } from "@/components/builder/card-builder";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = pageIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  try {
    const initial = await loadBuilder(user, id.data);
    return <CardBuilder pageId={id.data} initial={initial} />;
  } catch (error) {
    if (error instanceof AppError && [403, 404].includes(error.status)) notFound();
    throw error;
  }
}
