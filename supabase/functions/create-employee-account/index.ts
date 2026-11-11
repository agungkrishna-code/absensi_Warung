import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Sesi admin tidak ditemukan." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) return respond({ error: "Konfigurasi fungsi belum lengkap." }, 500);

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await callerClient.auth.getUser();
  if (authError || !user) return respond({ error: "Sesi tidak valid. Silakan masuk kembali." }, 401);

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || callerProfile?.role !== "admin") return respond({ error: "Hanya admin yang dapat membuat akun." }, 403);

  let input: { email?: string; password?: string; full_name?: string };
  try {
    input = await request.json();
  } catch {
    return respond({ error: "Data permintaan tidak valid." }, 400);
  }

  const email = input.email?.trim().toLowerCase();
  const fullName = input.full_name?.trim();
  const password = input.password;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond({ error: "Masukkan email yang valid." }, 400);
  if (!password || password.length < 8) return respond({ error: "Password awal minimal 8 karakter." }, 400);
  if (!fullName) return respond({ error: "Nama lengkap wajib diisi." }, 400);

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    const message = error?.message.toLowerCase().includes("already")
      ? "Email tersebut sudah digunakan akun lain."
      : error?.message ?? "Akun tidak berhasil dibuat.";
    return respond({ error: message }, 400);
  }

  return respond({ user_id: data.user.id, email: data.user.email });
});
