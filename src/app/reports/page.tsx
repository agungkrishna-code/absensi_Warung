"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { ProtectedPage } from "@/components/app-shell";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import {
  currentMonthInMakassar,
  downloadCsv,
  formatDate,
  formatMonth,
  formatTime,
  monthRange,
  statusLabel,
} from "@/lib/utils";
import type { AttendanceWithEmployee, Employee, WorkScheduleWithEmployee } from "@/types";

interface SummaryRow {
  employee: Employee;
  scheduled: number;
  attended: number;
  late: number;
  absent: number;
  unscheduled: number;
  rate: number;
}

export default function ReportsPage() {
  return (
    <ProtectedPage roles={["admin"]}>
      <ReportsContent />
    </ProtectedPage>
  );
}

function ReportsContent() {
  const [month, setMonth] = useState(currentMonthInMakassar());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleWithEmployee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { start, end } = monthRange(month);
    const supabase = getSupabase();
    const [employeeResult, scheduleResult, attendanceResult] = await Promise.all([
      supabase.from("employees").select("*").order("full_name"),
      supabase
        .from("work_schedules")
        .select("*, employees(full_name, employee_code)")
        .gte("work_date", start)
        .lte("work_date", end)
        .order("work_date"),
      supabase
        .from("attendance")
        .select("*, employees(full_name, employee_code)")
        .gte("work_date", start)
        .lte("work_date", end)
        .order("work_date", { ascending: false }),
    ]);

    setEmployees((employeeResult.data as Employee[] | null) ?? []);
    setSchedules((scheduleResult.data as WorkScheduleWithEmployee[] | null) ?? []);
    setAttendance((attendanceResult.data as AttendanceWithEmployee[] | null) ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const summary = useMemo<SummaryRow[]>(() => {
    return employees
      .map((employee) => {
        const employeeSchedules = schedules.filter((row) => row.employee_id === employee.id);
        const employeeAttendance = attendance.filter((row) => row.employee_id === employee.id);
        const attendedDates = new Set(employeeAttendance.map((row) => row.work_date));
        const scheduledDates = new Set(employeeSchedules.map((row) => row.work_date));
        const absent = employeeSchedules.filter((row) => !attendedDates.has(row.work_date)).length;
        const unscheduled = employeeAttendance.filter(
          (row) => !scheduledDates.has(row.work_date),
        ).length;

        return {
          employee,
          scheduled: employeeSchedules.length,
          attended: employeeAttendance.length,
          late: employeeAttendance.filter((row) => row.status === "late").length,
          absent,
          unscheduled,
          rate:
            employeeSchedules.length > 0
              ? Math.round(
                  ((employeeSchedules.length - absent) / employeeSchedules.length) * 100,
                )
              : 0,
        };
      })
      .filter((row) => row.scheduled > 0 || row.attended > 0);
  }, [employees, schedules, attendance]);

  const totals = useMemo(
    () =>
      summary.reduce(
        (acc, row) => ({
          scheduled: acc.scheduled + row.scheduled,
          attended: acc.attended + row.attended,
          late: acc.late + row.late,
          absent: acc.absent + row.absent,
        }),
        { scheduled: 0, attended: 0, late: 0, absent: 0 },
      ),
    [summary],
  );

  function exportSummary() {
    downloadCsv(
      `laporan-${month}.csv`,
      [
        "Bulan",
        "Kode",
        "Karyawan",
        "Hari dijadwalkan",
        "Hari hadir",
        "Terlambat",
        "Tanpa keterangan",
        "Di luar jadwal",
        "Kehadiran (%)",
      ],
      summary.map((row) => [
        formatMonth(month),
        row.employee.employee_code,
        row.employee.full_name,
        row.scheduled,
        row.attended,
        row.late,
        row.absent,
        row.unscheduled,
        row.rate,
      ]),
    );
  }

  function exportDetail() {
    downloadCsv(
      `detail-absensi-${month}.csv`,
      ["Tanggal", "Kode", "Karyawan", "Masuk", "Keluar", "Status"],
      attendance.map((row) => [
        row.work_date,
        row.employees?.employee_code ?? "",
        row.employees?.full_name ?? "",
        formatTime(row.check_in),
        formatTime(row.check_out),
        statusLabel(row.status),
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan bulanan"
        description="Rekap kehadiran dan kedisiplinan shift"
        action={
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value || currentMonthInMakassar())}
            className="w-auto"
            aria-label="Pilih bulan"
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Hari dijadwalkan" value={loading ? "—" : totals.scheduled} />
        <StatCard label="Kehadiran" value={loading ? "—" : totals.attended} />
        <StatCard label="Terlambat" value={loading ? "—" : totals.late} />
        <StatCard label="Tanpa keterangan" value={loading ? "—" : totals.absent} />
      </div>

      <Card>
        <CardHeader
          title={`Ringkasan ${formatMonth(month)}`}
          description="Hari tanpa keterangan = jadwal tanpa catatan absensi."
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportSummary}
                disabled={summary.length === 0}
              >
                <Icon icon="ph:file-csv" width={18} aria-hidden="true" /> Ringkasan CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportDetail}
                disabled={attendance.length === 0}
              >
                <Icon icon="ph:download-simple" width={18} aria-hidden="true" /> Detail CSV
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : summary.length === 0 ? (
          <EmptyState
            title="Belum ada data"
            description="Belum ada jadwal atau absensi pada bulan ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Karyawan</th>
                  <th className="px-5 py-3 text-right font-medium">Dijadwalkan</th>
                  <th className="px-5 py-3 text-right font-medium">Hadir</th>
                  <th className="px-5 py-3 text-right font-medium">Terlambat</th>
                  <th className="px-5 py-3 text-right font-medium">Tanpa ket.</th>
                  <th className="px-5 py-3 text-right font-medium">Di luar jadwal</th>
                  <th className="px-5 py-3 text-right font-medium">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {summary.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-stone-50/60">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-stone-800">{row.employee.full_name}</p>
                      <p className="text-xs text-stone-500">{row.employee.employee_code}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-stone-700">
                      {row.scheduled}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-stone-700">
                      {row.attended}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-amber-700">
                      {row.late}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-rose-700">
                      {row.absent}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-stone-500">
                      {row.unscheduled}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium text-stone-800">
                      {row.scheduled > 0 ? `${row.rate}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Detail absensi"
          description={`${attendance.length} catatan pada ${formatMonth(month)}`}
        />
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : attendance.length === 0 ? (
          <EmptyState title="Belum ada absensi" description="Tidak ada catatan pada bulan ini." />
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-stone-100 bg-white text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium">Karyawan</th>
                  <th className="px-5 py-3 font-medium">Masuk</th>
                  <th className="px-5 py-3 font-medium">Keluar</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {attendance.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-stone-700">
                      {formatDate(row.work_date)}
                    </td>
                    <td className="px-5 py-3 text-stone-700">
                      {row.employees?.full_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-stone-700">
                      {formatTime(row.check_in)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-stone-700">
                      {formatTime(row.check_out)}
                    </td>
                    <td className="px-5 py-3 text-stone-700">{statusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
