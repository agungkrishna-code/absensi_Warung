"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { motion } from "motion/react";
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen items-stretch"
    >
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-800 via-teal-900 to-violet-950 p-10 text-stone-100 lg:flex">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-teal-400/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute right-16 top-1/3 size-40 rounded-full bg-orange-400/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
          className="relative flex items-center gap-3"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-violet-500 text-white">
            <Icon icon="ph:storefront" width={24} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Warung Attendance</p>
            <p className="text-xs text-stone-400">Manajemen absensi karyawan</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
          className="relative max-w-md"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-300">
            Absensi harian
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white">
            Catat kehadiran tanpa ribet.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-teal-100/70">
            Check-in, check-out, jadwal shift, dan laporan bulanan dalam satu tempat.
            Waktu absensi mengikuti zona WITA.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="relative text-xs text-stone-500"
        >
          Warung Attendance · WITA
        </motion.p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white/60 px-5 py-10 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm rounded-2xl border border-teal-100/80 bg-white/90 p-6 shadow-(--shadow-lift) backdrop-blur-sm sm:p-8 lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none lg:backdrop-blur-none"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-violet-600 text-white shadow-sm shadow-teal-600/25">
              <Icon icon="ph:storefront" width={22} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold leading-tight">Warung Attendance</p>
              <p className="text-xs text-stone-500">Manajemen absensi karyawan</p>
            </div>
          </div>

          <h2 className="bg-gradient-to-r from-teal-700 to-violet-700 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">Masuk</h2>
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
            Belum punya akun? Hubungi admin warung — admin bisa membuatkan akun langsung dari
            halaman Karyawan.
          </p>
        </motion.div>
      </section>
    </motion.div>
  );
}
