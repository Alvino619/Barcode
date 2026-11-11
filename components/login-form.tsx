"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: data.get("email"), password: data.get("password"), redirect: false, callbackUrl: "/admin",
      });
      if (result?.ok && !result.error) window.location.assign("/admin");
      else setError("Tidak dapat masuk. Periksa email dan kata sandi Anda.");
    } catch {
      setError("Tidak dapat menghubungi server. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="h-11 w-full rounded-md border bg-white px-3 focus-visible:outline-primary" /></div>
      <div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Kata sandi</label><input id="password" name="password" type="password" required autoComplete="current-password" className="h-11 w-full rounded-md border bg-white px-3 focus-visible:outline-primary" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Memproses…" : "Masuk"}</Button>
    </form>
  );
}
