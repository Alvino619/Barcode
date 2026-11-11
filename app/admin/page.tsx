import { requireUser } from "@/server/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminPage() {
  const user = await requireUser();
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold">Halo, {user.name}</h1><SignOutButton /></div><p className="text-muted-foreground">Anda berhasil masuk. Area pengelola siap untuk pengembangan fase berikutnya.</p></div>;
}
