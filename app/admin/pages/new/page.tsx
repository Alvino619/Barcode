import { PageEditor } from "@/components/page-editor";
import { requireUser } from "@/server/auth";

export default async function NewPage() {
  await requireUser();
  return <PageEditor />;
}
