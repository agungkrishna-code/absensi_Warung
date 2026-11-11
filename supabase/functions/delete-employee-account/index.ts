import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authorization = request.headers.get("Authorization");
  if (request.method !== "POST" || !authorization?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403, headers: corsHeaders });

  let userId: unknown;
  try {
    ({ user_id: userId } = await request.json());
  } catch {
    return new Response("Invalid request", { status: 400, headers: corsHeaders });
  }
  if (typeof userId !== "string" || userId === user.id) {
    return new Response("Invalid user", { status: 400, headers: corsHeaders });
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  return new Response(error ? "Could not remove account" : null, {
    status: error ? 500 : 204,
    headers: corsHeaders,
  });
});
