"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { Employee, EmployeeWithProfile, Profile } from "@/types";

const emptyForm = {
  profile_id: "",
  create_account: false,
  email: "",
  password: "",
  username: "",
  employee_code: "",
  full_name: "",
  phone: "",
  position: "",
  employment_status: "active" as Employee["employment_status"],
};

export default function EmployeesPage() {
  return (
    <ProtectedPage roles={["admin"]}>
      <EmployeesContent />
    </ProtectedPage>
  );
}

function EmployeesContent() {
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [employeeResult, profileResult] = await Promise.all([
      supabase
        .from("employees")
        .select("*, profiles(email, full_name, username)")
        .order("full_name"),
      supabase.from("profiles").select("*").order("email"),
    ]);

    setEmployees((employeeResult.data as EmployeeWithProfile[] | null) ?? []);
    setProfiles((profileResult.data as Profile[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const linkedProfileIds = useMemo(
    () => new Set(employees.map((employee) => employee.profile_id).filter(Boolean)),
    [employees],
  );

  const availableProfiles = profiles.filter(
    (profile) => !linkedProfileIds.has(profile.id) || profile.id === editing?.profile_id,
  );

  const filtered = employees.filter((employee) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [employee.full_name, employee.employee_code, employee.position, employee.profiles?.email, employee.profiles?.username]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term));
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEdit(employee: EmployeeWithProfile) {
    setEditing(employee);
    setForm({
      profile_id: employee.profile_id ?? "",
      create_account: false,
      email: employee.profiles?.email ?? "",
      password: "",
      username: employee.profiles?.username ?? "",
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      phone: employee.phone ?? "",
      position: employee.position ?? "",
      employment_status: employee.employment_status,
    });
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleProfileChange(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId);
    setForm((current) => ({
      ...current,
      profile_id: profileId,
      username: profile?.username ?? "",
      full_name:
        current.full_name ||
        profile?.full_name ||
        profile?.email?.split("@")[0] ||
        "",
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const username = form.username.trim().toLowerCase();
    if (form.create_account && !editing && form.password.length < 8) {
      setError("Password awal minimal 8 karakter.");
      setSaving(false);
      return;
    }
    if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
      setError("Username harus 3–30 karakter, hanya huruf kecil, angka, titik, garis bawah, atau tanda hubung.");
      setSaving(false);
      return;
    }

    const supabase = getSupabase();
    let profileId = form.profile_id;

    if (form.create_account && !editing) {
      const { data, error: accountError } = await supabase.functions.invoke("create-employee-account", {
        body: { email: form.email, password: form.password, full_name: form.full_name },
      });
      if (accountError || data?.error) {
        setError(data?.error ?? accountError?.message ?? "Akun login tidak berhasil dibuat.");
        setSaving(false);
        return;
      }
      profileId = data.user_id as string;
    }

    const payload = {
      profile_id: profileId || null,
      employee_code: form.employee_code.trim(),
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      position: form.position.trim() || null,
      employment_status: form.employment_status,
    };

    const result = editing
      ? await supabase.from("employees").update(payload).eq("id", editing.id)
      : await supabase.from("employees").insert(payload);

    if (result.error) {
      if (form.create_account && profileId) {
        const { error: cleanupError } = await supabase.functions.invoke("delete-employee-account", { body: { user_id: profileId } });
        setError(cleanupError ? `${result.error.message} Akun login juga perlu dihapus dari Supabase Auth.` : (
          result.error.code === "23505" ? "Kode karyawan sudah dipakai." : result.error.message
        ));
        setSaving(false);
        return;
      }
      setError(
        result.error.code === "23505"
          ? "Kode karyawan atau akun profil sudah dipakai."
          : result.error.message,
      );
      setSaving(false);
      return;
    }

    if (profileId) {
      const { error: usernameError } = await supabase
        .from("profiles")
        .update({ username: username || null })
        .eq("id", profileId);

      if (usernameError) {
        if (form.create_account && profileId) {
          const { error: cleanupError } = await supabase.functions.invoke("delete-employee-account", { body: { user_id: profileId } });
          if (cleanupError) {
            setError("Username gagal disimpan dan akun Auth tidak berhasil dibersihkan. Hapus akun yang baru dibuat dari Supabase Auth.");
            setSaving(false);
            await load();
            return;
          }
        }
        setError(
          usernameError.code === "23505"
            ? "Username sudah digunakan akun lain."
            : usernameError.message,
        );
        setSaving(false);
        await load();
        return;
      }
    }

    setFormOpen(false);
    setMessage(editing ? "Data karyawan diperbarui." : "Karyawan ditambahkan.");
    setSaving(false);
    await load();
  }

  async function toggleStatus(employee: EmployeeWithProfile) {
    const next = employee.employment_status === "active" ? "inactive" : "active";
    const { error: updateError } = await getSupabase()
      .from("employees")
      .update({ employment_status: next })
      .eq("id", employee.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage(next === "active" ? "Karyawan diaktifkan." : "Karyawan dinonaktifkan.");
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karyawan"
        description="Kelola data dan status karyawan warung"
        action={
          <Button onClick={openCreate}>
            <Icon icon="ph:plus" width={19} aria-hidden="true" /> Tambah karyawan
          </Button>
        }
      />

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error && !formOpen ? <Alert>{error}</Alert> : null}

      <Alert tone="info">
        Admin dapat membuat akun login langsung saat menambahkan karyawan. Role admin hanya diubah lewat database.
      </Alert>

      {formOpen ? (
        <Card>
          <CardHeader
            title={editing ? "Ubah karyawan" : "Karyawan baru"}
            description="Hubungkan ke akun login agar karyawan bisa absen."
            action={
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                <Icon icon="ph:x" width={18} aria-hidden="true" /> Tutup
              </Button>
            }
          />
          <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
            {error ? <Alert>{error}</Alert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {!editing ? (
                <Field label="Akun login">
                  <Select
                    value={form.create_account ? "create" : form.profile_id}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "create") {
                        setForm((current) => ({ ...current, create_account: true, profile_id: "" }));
                      } else {
                        setForm((current) => ({ ...current, create_account: false, password: "" }));
                        handleProfileChange(value);
                      }
                    }}
                  >
                    <option value="">Tanpa akun login</option>
                    <option value="create">Buat akun login baru</option>
                    {availableProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.email ?? profile.full_name ?? profile.id}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              {form.create_account ? (
                <>
                  <Field label="Email login" hint="Email ini dipakai karyawan untuk masuk.">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="nama@contoh.com"
                      autoComplete="email"
                      required
                    />
                  </Field>
                  <Field label="Password awal" hint="Minimal 8 karakter. Sampaikan password ini kepada karyawan secara aman.">
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>
                </>
              ) : null}
              {!form.create_account && !editing && form.profile_id ? (
                <Field label="Akun login" hint="Akun yang sudah terhubung untuk karyawan ini.">
                  <Input value={profiles.find((profile) => profile.id === form.profile_id)?.email ?? "Akun terhubung"} disabled />
                </Field>
              ) : null}
              {!form.create_account && editing ? (
                <Field label="Akun login" hint="Pilih akun yang sudah terdaftar.">
                  <Select value={form.profile_id} onChange={(event) => handleProfileChange(event.target.value)}>
                    <option value="">Tanpa akun</option>
                    {availableProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.email ?? profile.full_name ?? profile.id}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field
                label="Username login"
                hint={form.profile_id || form.create_account ? "Boleh kosong. Username unik dan dapat dipakai untuk login." : "Pilih atau buat akun login untuk mengatur username."}
              >
                <Input
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  placeholder="contoh: budi.kasir"
                  autoComplete="off"
                  disabled={!form.profile_id && !form.create_account}
                />
              </Field>
              <Field label="Kode karyawan">
                <Input
                  value={form.employee_code}
                  onChange={(event) => updateField("employee_code", event.target.value)}
                  placeholder="WRG-001"
                  required
                />
              </Field>
              <Field label="Nama lengkap">
                <Input
                  value={form.full_name}
                  onChange={(event) => updateField("full_name", event.target.value)}
                  placeholder="Nama karyawan"
                  required
                />
              </Field>
              <Field label="Nomor telepon">
                <Input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="08xx"
                />
              </Field>
              <Field label="Posisi">
                <Input
                  value={form.position}
                  onChange={(event) => updateField("position", event.target.value)}
                  placeholder="Kasir, dapur, pelayan…"
                />
              </Field>
              <Field label="Status kerja">
                <Select
                  value={form.employment_status}
                  onChange={(event) =>
                    updateField(
                      "employment_status",
                      event.target.value as Employee["employment_status"],
                    )
                  }
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner className="size-4 border-white/40 border-t-white" /> : null}
                {editing ? "Simpan perubahan" : "Tambah karyawan"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 sm:px-5">
          <div className="relative w-full sm:max-w-xs">
            <Icon
              icon="ph:magnifying-glass"
              width={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, kode, username, atau email"
              className="pl-9"
              aria-label="Cari karyawan"
            />
          </div>
          <p className="text-xs text-stone-500">{filtered.length} karyawan</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Belum ada karyawan"
            description="Tambahkan karyawan pertama untuk mulai mencatat absensi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Karyawan</th>
                  <th className="px-5 py-3 font-medium">Kontak</th>
                  <th className="px-5 py-3 font-medium">Posisi</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100/70">
                {filtered.map((employee) => (
                  <tr key={employee.id} className="hover:bg-stone-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                          <Icon icon="ph:user-circle" width={19} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-medium text-stone-800">{employee.full_name}</p>
                          <p className="text-xs text-stone-500">
                            {employee.employee_code}
                            {employee.profiles?.username ? ` · @${employee.profiles.username}` : ""}
                            {employee.profiles?.email ? ` · ${employee.profiles.email}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-stone-600">
                      {employee.phone || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">{employee.position || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={employee.employment_status === "active" ? "present" : "neutral"}>
                        {employee.employment_status === "active" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(employee)}
                          aria-label={`Ubah ${employee.full_name}`}
                        >
                          <Icon icon="ph:pencil-simple" width={17} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleStatus(employee)}
                        >
                          {employee.employment_status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
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
