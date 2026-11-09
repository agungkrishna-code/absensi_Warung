"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Badge, Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const adminNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Karyawan", icon: Users },
  { href: "/attendance", label: "Absensi", icon: ClipboardList },
  { href: "/schedules", label: "Jadwal", icon: CalendarDays },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

const employeeNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Riwayat", icon: ClipboardList },
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
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-600 text-white">
            <UtensilsCrossed size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-stone-900">Warung</p>
            <p className="text-xs text-stone-500">Attendance</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-100 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
              <p className="truncate text-xs text-stone-500">{profile.email}</p>
            </div>
            <Badge tone={profile.role === "admin" ? "admin" : "neutral"}>
              {profile.role === "admin" ? "Admin" : "Karyawan"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void signOut()}
          >
            <LogOut size={16} /> Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-600 text-white">
              <UtensilsCrossed size={16} />
            </span>
            <span className="text-sm font-semibold">Warung Attendance</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Keluar">
            <LogOut size={16} />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white/95 backdrop-blur md:hidden">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                  active ? "text-amber-700" : "text-stone-500",
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
