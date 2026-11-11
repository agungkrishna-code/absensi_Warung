"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { ProtectedPage } from "@/components/app-shell";
import {
  Alert,
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
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import {
  currentMonthInMakassar,
  formatDate,
  formatMonth,
  formatShift,
  monthRange,
  todayInMakassar,
} from "@/lib/utils";
import type { Employee, WorkScheduleWithEmployee } from "@/types";

export default function SchedulesPage() {
  return (
    <ProtectedPage roles={["admin"]}>
      <SchedulesContent />
    </ProtectedPage>
  );
}

function SchedulesContent() {
  const [month, setMonth] = useState(currentMonthInMakassar());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    work_date: todayInMakassar(),
    shift_start: "08:00",
    shift_end: "16:00",
  });

  useEffect(() => {
    async function loadEmployees() {
      const { data } = await getSupabase()
        .from("employees")
        .select("*")
        .eq("employment_status", "active")
        .order("full_name");
      setEmployees((data as Employee[] | null) ?? []);
    }
    void loadEmployees();
  }, []);

  const load = useCallback(async () => {
    const { start, end } = monthRange(month);
    const { data } = await getSupabase()
      .from("work_schedules")
      .select("*, employees(full_name, employee_code)")
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date");
    setSchedules((data as WorkScheduleWithEmployee[] | null) ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const { error: insertError } = await getSupabase().from("work_schedules").insert({
      employee_id: form.employee_id,
      work_date: form.work_date,
      shift_start: form.shift_start,
      shift_end: form.shift_end,
    });

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "Karyawan sudah punya jadwal pada tanggal tersebut."
          : insertError.code === "23514"
            ? "Jam selesai harus lebih lambat dari jam mulai (shift tidak melewati tengah malam)."
            : insertError.message,
      );
      setSaving(false);
      return;
    }

    setMessage("Jadwal ditambahkan.");
    setSaving(false);
    const targetMonth = form.work_date.slice(0, 7);
    if (targetMonth !== month) setMonth(targetMonth);
    else await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus jadwal ini?")) return;
    const { error: deleteError } = await getSupabase()
      .from("work_schedules")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Jadwal dihapus.");
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal shift"
        description="Satu jadwal per karyawan per hari"
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

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}

      <Card>
        <CardHeader
          title="Tambah jadwal"
          description="Check-in setelah jam mulai dihitung terlambat."
        />
        <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Field label="Karyawan">
              <Select
                value={form.employee_id}
                onChange={(event) => setForm({ ...form, employee_id: event.target.value })}
                required
              >
                <option value="">Pilih karyawan</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_code})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Tanggal">
            <Input
              type="date"
              value={form.work_date}
              onChange={(event) => setForm({ ...form, work_date: event.target.value })}
              required
            />
          </Field>
          <Field label="Mulai">
            <Input
              type="time"
              value={form.shift_start}
              onChange={(event) => setForm({ ...form, shift_start: event.target.value })}
              required
            />
          </Field>
          <Field label="Selesai">
            <Input
              type="time"
              value={form.shift_end}
              onChange={(event) => setForm({ ...form, shift_end: event.target.value })}
              required
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-5 lg:flex lg:justify-end">
            <Button type="submit" disabled={saving} className="w-full lg:w-auto">
              {saving ? <Spinner className="size-4 border-white/40 border-t-white" /> : <Icon icon="ph:calendar-plus" width={19} aria-hidden="true" />}
              Simpan jadwal
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={`Jadwal ${formatMonth(month)}`}
          description={`${schedules.length} jadwal`}
        />
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            title="Belum ada jadwal"
            description="Tambahkan shift agar status terlambat bisa dihitung."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium">Karyawan</th>
                  <th className="px-5 py-3 font-medium">Shift</th>
                  <th className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100/70">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-stone-50/60">
                    <td className="whitespace-nowrap px-5 py-3.5 text-stone-700">
                      {formatDate(schedule.work_date, { weekday: "long" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-stone-800">
                        {schedule.employees?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-stone-500">
                        {schedule.employees?.employee_code}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone="neutral">
                        {formatShift(schedule.shift_start)}–{formatShift(schedule.shift_end)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void remove(schedule.id)}
                        aria-label="Hapus jadwal"
                      >
                        <Icon icon="ph:trash" width={17} aria-hidden="true" /> Hapus
                      </Button>
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
