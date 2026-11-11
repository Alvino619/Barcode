import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16"><div><p className="mb-3 text-sm font-semibold text-primary">QR Card Page</p><h1 className="text-3xl font-bold">Masuk pengelola</h1><p className="mt-2 text-muted-foreground">Gunakan akun pengelola Anda.</p></div><LoginForm /></main>;
}
