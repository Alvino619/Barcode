import { requireUser } from "@/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <main className="mx-auto max-w-4xl px-6 py-16">{children}</main>;
}
