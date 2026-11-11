"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/components/auth-provider";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const adminNav = [
  { href: "/dashboard", label: "Dashboard", icon: "ph:house-line" },
  { href: "/employees", label: "Karyawan", icon: "ph:users-three" },
  { href: "/attendance", label: "Absensi", icon: "ph:clipboard-text" },
  { href: "/schedules", label: "Jadwal", icon: "ph:calendar-dots" },
  { href: "/reports", label: "Laporan", icon: "ph:chart-bar" },
];

const employeeNav = [
  { href: "/dashboard", label: "Dashboard", icon: "ph:house-line" },
  { href: "/attendance", label: "Riwayat", icon: "ph:clipboard-text" },
];

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">{children}</div>
    </div>
  );
}

export function ProtectedPage({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const { session, profile, employee, loading, error, refresh, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const rolesKey = roles.join(",");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (profile && !rolesKey.split(",").includes(profile.role)) {
      router.replace("/dashboard");
    }
  }, [loading, session, profile, rolesKey, router]);

  if (loading) {
    return (
      <FullScreen>
        <Spinner />
        <p className="text-sm text-stone-500">Memuat sesi…</p>
      </FullScreen>
    );
  }

  if (!session) {
    return (
      <FullScreen>
        <Spinner />
        <p className="text-sm text-stone-500">Mengalihkan ke halaman masuk…</p>
      </FullScreen>
    );
  }

  if (!profile) {
    return (
      <FullScreen>
        <div className="max-w-sm space-y-3">
          <p className="font-semibold text-stone-900">Profil belum tersedia</p>
          <p className="text-sm text-stone-500">
            {error ?? "Akun ini belum memiliki profil. Hubungi admin warung."}
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              Muat ulang
            </Button>
            <Button onClick={() => void signOut()}>Keluar</Button>
          </div>
        </div>
      </FullScreen>
    );
  }

  if (!roles.includes(profile.role)) {
    return (
      <FullScreen>
        <Spinner />
        <p className="text-sm text-stone-500">Mengalihkan…</p>
      </FullScreen>
    );
  }

  const nav = profile.role === "admin" ? adminNav : employeeNav;
  const displayName = employee?.full_name ?? profile.full_name ?? profile.email ?? "Pengguna";

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-teal-800 via-teal-900 to-violet-950 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur">
            <Icon icon="ph:storefront" width={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Warung</p>
            <p className="text-xs text-teal-200/80">Attendance</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  active
                    ? "bg-white/15 text-white"
                    : "text-teal-100/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {active ? (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-400"
                    aria-hidden="true"
                  />
                ) : null}
                <Icon icon={item.icon} width={19} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-semibold uppercase text-stone-900">
              {displayName.slice(0, 2)}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="w-full truncate text-sm font-medium text-white">{displayName}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                  profile.role === "admin"
                    ? "bg-amber-400/20 text-amber-200 ring-amber-300/30"
                    : "bg-white/10 text-teal-100 ring-white/20",
                )}
              >
                {profile.role === "admin" ? "Admin" : "Karyawan"}
              </span>
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex min-h-11 w-full cursor-pointer items-center justify-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-teal-100/80 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Icon icon="ph:sign-out" width={18} aria-hidden="true" /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-teal-700 to-violet-700 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
              <Icon icon="ph:storefront" width={18} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-white">Warung Attendance</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={() => void signOut()}
            aria-label="Keluar"
          >
            <Icon icon="ph:sign-out" width={18} aria-hidden="true" />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-gradient-to-r from-teal-800 to-violet-900 pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white",
                  active ? "text-amber-300" : "text-teal-100/60",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 items-center justify-center rounded-full px-4 transition-colors duration-150",
                    active ? "bg-white/15" : "",
                  )}
                >
                  <Icon
                    icon={active ? `${item.icon}-fill` : item.icon}
                    width={20}
                    aria-hidden="true"
                  />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
