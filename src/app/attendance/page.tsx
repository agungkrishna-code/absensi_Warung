"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/components/auth-provider";
import { ProtectedPage } from "@/components/app-shell";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
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
import type { Attendance, AttendanceWithEmployee, Employee } from "@/types";

export default function AttendancePage() {
  return (
    <ProtectedPage roles={["admin", "employee"]}>
      <AttendanceContent />
    </ProtectedPage>
  );
}

function AttendanceContent() {
  const { profile } = useAuth();
  return profile?.role === "admin" ? <AdminAttendance /> : <EmployeeAttendance />;
}

function EmployeeAttendance() {
  const { employee } = useAuth();
  const [month, setMonth] = useState(currentMonthInMakassar());
  const [rows, setRows] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!employee) {
      setLoading(false);
      return;
    }
    const { start, end } = monthRange(month);
    const { data } = await getSupabase()
      .from("attendance")
      .select("*")
      .eq("employee_id", employee.id)
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: false });

    setRows((data as Attendance[] | null) ?? []);
    setLoading(false);
  }, [employee, month]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (!employee) {
    return (
      <div>
        <PageHeader title="Riwayat absensi" />
        <Card>
          <EmptyState
            title="Akun belum terhubung"
            description="Hubungi admin untuk menghubungkan akun dengan data karyawan."
          />
        </Card>
      </div>
    );
  }

  const late = rows.filter((row) => row.status === "late").length;
  const complete = rows.filter((row) => row.check_out).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat absensi"
        description="Kehadiran pribadi per bulan"
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

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Hari hadir" value={loading ? "—" : rows.length} />
        <StatCard label="Terlambat" value={loading ? "—" : late} />
        <StatCard label="Sudah pulang" value={loading ? "—" : complete} />
      </div>

      <Card>
        <CardHeader title={formatMonth(month)} description={`${rows.length} catatan absensi`} />
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada absensi" description="Tidak ada catatan pada bulan ini." />
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    {formatDate(row.work_date, { weekday: "long" })}
                  </p>
                  <p className="text-xs text-stone-500">
                    Masuk {formatTime(row.check_in)} · Pulang {formatTime(row.check_out)}
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
  );
}

function AdminAttendance() {
  const [month, setMonth] = useState(currentMonthInMakassar());
  const [employeeId, setEmployeeId] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<AttendanceWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmployees() {
      const { data } = await getSupabase()
        .from("employees")
        .select("*")
        .order("full_name");
      setEmployees((data as Employee[] | null) ?? []);
    }
    void loadEmployees();
  }, []);

  const load = useCallback(async () => {
    const { start, end } = monthRange(month);
    const { data } = await getSupabase()
      .from("attendance")
      .select("*, employees(full_name, employee_code)")
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: false });

    setRows((data as AttendanceWithEmployee[] | null) ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (employeeId === "all" || row.employee_id === employeeId) &&
          (status === "all" || row.status === status),
      ),
    [rows, employeeId, status],
  );

  function exportCsv() {
    downloadCsv(
      `absensi-${month}.csv`,
      ["Tanggal", "Kode", "Karyawan", "Check-in", "Check-out", "Status"],
      filtered.map((row) => [
        row.work_date,
        row.employees?.employee_code ?? "",
        row.employees?.full_name ?? "",
        formatTime(row.check_in),
        formatTime(row.check_out),
        statusLabel(row.status),
      ]),
    );
  }

  const late = filtered.filter((row) => row.status === "late").length;
  const complete = filtered.filter((row) => row.check_out).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi"
        description="Rekap kehadiran seluruh karyawan"
        action={
          <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Icon icon="ph:download-simple" width={18} aria-hidden="true" /> Ekspor CSV
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total catatan" value={loading ? "—" : filtered.length} />
        <StatCard label="Terlambat" value={loading ? "—" : late} />
        <StatCard label="Sudah pulang" value={loading ? "—" : complete} />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
          <span className="mb-2.5 text-stone-400">
            <Icon icon="ph:funnel" width={18} aria-hidden="true" />
          </span>
          <div className="min-w-40 flex-1 sm:max-w-52">
            <Field label="Bulan">
              <Input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value || currentMonthInMakassar())}
              />
            </Field>
          </div>
          <div className="min-w-44 flex-1 sm:max-w-60">
            <Field label="Karyawan">
              <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="all">Semua karyawan</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="min-w-36 flex-1 sm:max-w-44">
            <Field label="Status">
              <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Semua status</option>
                <option value="present">Hadir</option>
                <option value="late">Terlambat</option>
              </Select>
            </Field>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada data" description="Coba ubah bulan atau filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium">Karyawan</th>
                  <th className="px-5 py-3 font-medium">Masuk</th>
                  <th className="px-5 py-3 font-medium">Keluar</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/60">
                    <td className="whitespace-nowrap px-5 py-3 text-stone-700">
                      {formatDate(row.work_date, { weekday: "short" })}
                    </td>
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
    </div>
  );
}
