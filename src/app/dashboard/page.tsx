"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useAuth } from "@/components/auth-provider";
import { ProtectedPage } from "@/components/app-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import {
  formatClock,
  formatDate,
  formatShift,
  formatTime,
  statusLabel,
  todayInMakassar,
} from "@/lib/utils";
import type {
  Attendance,
  AttendanceWithEmployee,
  Employee,
  WorkSchedule,
} from "@/types";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Makassar",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

function friendlyError(message: string) {
  if (message.includes("Already checked in")) return "Kamu sudah check-in hari ini.";
  if (message.includes("Already checked out")) return "Kamu sudah check-out hari ini.";
  if (message.includes("No check-in")) return "Belum ada check-in hari ini.";
  if (message.includes("not active")) return "Status karyawan tidak aktif. Hubungi admin.";
  if (message.includes("not found")) return "Akun ini belum terhubung ke data karyawan.";
  return message;
}

export default function DashboardPage() {
  return (
    <ProtectedPage roles={["admin", "employee"]}>
      <DashboardContent />
    </ProtectedPage>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  return profile?.role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />;
}

function EmployeeDashboard() {
  const { profile, employee } = useAuth();
  const [now, setNow] = useState(new Date());
  const [today, setToday] = useState<Attendance | null>(null);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const workDate = todayInMakassar();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!employee) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    const [attendanceResult, scheduleResult, historyResult] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", workDate)
        .maybeSingle(),
      supabase
        .from("work_schedules")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", workDate)
        .maybeSingle(),
      supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .order("work_date", { ascending: false })
        .limit(7),
    ]);

    setToday((attendanceResult.data as Attendance | null) ?? null);
    setSchedule((scheduleResult.data as WorkSchedule | null) ?? null);
    setHistory((historyResult.data as Attendance[] | null) ?? []);
    setLoading(false);
  }, [employee, workDate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function record(action: "in" | "out") {
    setWorking(action);
    setMessage(null);

    const { error } = await getSupabase().rpc(
      action === "in" ? "record_check_in" : "record_check_out",
    );

    if (error) {
      setMessage({ tone: "error", text: friendlyError(error.message) });
    } else {
      setMessage({
        tone: "success",
        text: action === "in" ? "Check-in berhasil dicatat." : "Check-out berhasil dicatat.",
      });
      await load();
    }

    setWorking(null);
  }

  const displayName = employee?.full_name ?? profile?.full_name ?? profile?.email ?? "Karyawan";

  if (!employee) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Absensi karyawan" />
        <Alert tone="info">
          Akun ini belum terhubung ke data karyawan. Hubungi admin untuk melengkapi data.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${displayName.split(" ")[0]}`}
        description={formatClock(now)}
        action={<Badge tone="neutral">WITA</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <div className="relative bg-stone-900 px-5 py-6 text-white sm:px-7">
            <div className="absolute -right-10 -top-16 size-48 rounded-full bg-amber-500/15 blur-2xl" />
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
              Absensi hari ini
            </p>
            <p className="mt-1.5 text-lg font-medium">{formatDate(workDate, { weekday: "long" })}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <Icon icon="ph:calendar-dots" width={16} className="text-amber-400" aria-hidden="true" />
                {schedule
                  ? `Shift ${formatShift(schedule.shift_start)}–${formatShift(schedule.shift_end)}`
                  : "Tidak ada jadwal shift"}
              </span>
              {today ? (
                <Badge tone={today.status === "late" ? "late" : "present"}>
                  {statusLabel(today.status)}
                </Badge>
              ) : (
                <Badge tone="neutral">Belum check-in</Badge>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 px-3.5 py-3">
                <p className="text-xs text-stone-400">Check-in</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatTime(today?.check_in)}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 px-3.5 py-3">
                <p className="text-xs text-stone-400">Check-out</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatTime(today?.check_out)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5 sm:p-6">
            {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="accent"
                className="py-3"
                disabled={loading || Boolean(today) || working !== null}
                onClick={() => void record("in")}
              >
                {working === "in" ? (
                  <Spinner className="size-4 border-white/40 border-t-white" />
                ) : (
                  <Icon icon="ph:sign-in" width={19} aria-hidden="true" />
                )}
                Check-in
              </Button>
              <Button
                variant="secondary"
                className="py-3"
                disabled={loading || !today || Boolean(today.check_out) || working !== null}
                onClick={() => void record("out")}
              >
                {working === "out" ? <Spinner className="size-4" /> : <Icon icon="ph:sign-out" width={19} aria-hidden="true" />}
                Check-out
              </Button>
            </div>
            <p className="text-xs text-stone-500">
              Waktu absensi dicatat oleh server database mengikuti zona Asia/Makassar.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Riwayat terakhir"
            action={
              <Link
                href="/attendance"
                className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
              >
                Semua <Icon icon="ph:arrow-right" width={16} aria-hidden="true" />
              </Link>
            }
          />
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : history.length === 0 ? (
            <EmptyState title="Belum ada riwayat" description="Absensi pertama akan muncul di sini." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {history.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {formatDate(row.work_date, { weekday: "short" })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatTime(row.check_in)} – {formatTime(row.check_out)}
                    </p>
                  </div>
                  <Badge tone={row.status === "late" ? "late" : "present"}>
                    {statusLabel(row.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const workDate = todayInMakassar();

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const [employeeResult, attendanceResult] = await Promise.all([
        supabase.from("employees").select("*").eq("employment_status", "active"),
        supabase
          .from("attendance")
          .select("*, employees(full_name, employee_code)")
          .eq("work_date", workDate)
          .order("check_in", { ascending: false }),
      ]);

      setEmployees((employeeResult.data as Employee[] | null) ?? []);
      setAttendance((attendanceResult.data as AttendanceWithEmployee[] | null) ?? []);
      setLoading(false);
    }

    void load();
  }, [workDate]);

  const checkedInIds = new Set(attendance.map((row) => row.employee_id));
  const notCheckedIn = employees.filter((employee) => !checkedInIds.has(employee.id)).length;
  const late = attendance.filter((row) => row.status === "late").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${formatDate(workDate, { weekday: "long" })} · ringkasan hari ini`}
        action={
          <Link href="/reports">
            <Button variant="secondary" size="sm">
              Lihat laporan <Icon icon="ph:arrow-right" width={17} aria-hidden="true" />
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Karyawan aktif"
          value={loading ? "—" : employees.length}
          icon={<Icon icon="ph:users-three" width={19} aria-hidden="true" />}
        />
        <StatCard
          label="Sudah absen"
          value={loading ? "—" : attendance.length}
          icon={<Icon icon="ph:check-circle" width={19} aria-hidden="true" />}
        />
        <StatCard
          label="Terlambat"
          value={loading ? "—" : late}
          icon={<Icon icon="ph:hourglass-medium" width={19} aria-hidden="true" />}
        />
        <StatCard
          label="Belum absen"
          value={loading ? "—" : notCheckedIn}
          icon={<Icon icon="ph:clock" width={19} aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Absensi hari ini"
          description={`${attendance.length} dari ${employees.length} karyawan aktif`}
          action={
            <Link
              href="/attendance"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Semua <Icon icon="ph:arrow-right" width={16} aria-hidden="true" />
            </Link>
          }
        />
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : attendance.length === 0 ? (
          <EmptyState title="Belum ada absensi" description="Belum ada karyawan yang check-in hari ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Karyawan</th>
                  <th className="px-5 py-3 font-medium">Masuk</th>
                  <th className="px-5 py-3 font-medium">Keluar</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {attendance.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-stone-800">
                        {row.employees?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-stone-500">{row.employees?.employee_code}</p>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-stone-700">
                      {formatTime(row.check_in)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-stone-700">
                      {formatTime(row.check_out)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={row.status === "late" ? "late" : "present"}>
                        {statusLabel(row.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-stone-500">
        Masuk sebagai {profile?.email}. Data ditampilkan sesuai zona waktu WITA.
      </p>
    </div>
  );
}
