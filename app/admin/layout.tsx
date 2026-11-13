import { requireUser } from "@/server/auth";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { ToastProvider } from "@/components/toast-provider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <ToastProvider><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link href="/admin" className="flex items-center gap-3 font-semibold"><span className="rounded-xl bg-primary p-2 text-white"><QrCode className="h-5 w-5" /></span>QR Card Page</Link><div className="flex items-center gap-4"><div className="text-right text-sm"><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.role === "ADMIN" ? "Administrator" : "Editor"}</p></div><SignOutButton /></div></div></header><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main></ToastProvider>;
}
