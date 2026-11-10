"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/components/auth-provider";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && session) router.replace("/dashboard");
  }, [authLoading, session, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = getSupabase();
      const value = identifier.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      let loginEmail = value;

      if (!isEmail) {
        const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
          "email_for_username",
          { p_username: value },
        );
        if (lookupError || !resolvedEmail) {
          setError("Username/email atau kata sandi salah.");
          return;
        }
        loginEmail = resolvedEmail;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Username/email atau kata sandi salah."
            : signInError.message,
        );
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-stretch">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-stone-900 p-10 text-stone-100 lg:flex">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-amber-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-600 text-white">
            <Icon icon="ph:storefront" width={24} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Warung Attendance</p>
            <p className="text-xs text-stone-400">Manajemen absensi karyawan</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-500">
            Absensi harian
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
            Catat kehadiran tanpa ribet.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-400">
            Check-in, check-out, jadwal shift, dan laporan bulanan dalam satu tempat.
            Waktu absensi mengikuti zona WITA.
          </p>
        </div>

        <p className="relative text-xs text-stone-500">Warung Attendance · WITA</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-600 text-white">
              <Icon icon="ph:storefront" width={22} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold leading-tight">Warung Attendance</p>
              <p className="text-xs text-stone-500">Manajemen absensi karyawan</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Masuk</h2>
          <p className="mt-1 text-sm text-stone-500">
            Gunakan akun yang diberikan admin warung.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error ? <Alert>{error}</Alert> : null}

            <Field label="Username atau email">
              <Input
                type="text"
                name="username"
                autoComplete="username"
                placeholder="username atau nama@warung.id"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </Field>

            <Field label="Kata sandi">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-400 hover:text-stone-700"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  <Icon icon={showPassword ? "ph:eye-slash" : "ph:eye"} width={19} aria-hidden="true" />
                </button>
              </div>
            </Field>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Spinner className="size-4 border-white/40 border-t-white" /> : <Icon icon="ph:sign-in" width={19} aria-hidden="true" />}
              {submitting ? "Memproses…" : "Masuk"}
            </Button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-stone-500">
            Belum punya akun? Hubungi admin warung. Akun karyawan dibuat melalui Supabase
            Dashboard, bukan lewat halaman ini.
          </p>
        </div>
      </section>
    </div>
  );
}
