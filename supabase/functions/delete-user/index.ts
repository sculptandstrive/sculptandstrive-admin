import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  // Browser sends a preflight OPTIONS request before the real POST must handle it
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Extract and verify the caller's JWT  
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return json({ error: "Not authenticated" }, 401);
    }

    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) {
      return json({ error: "Not authenticated" }, 401);
    }

    const { data: callerRole, error: roleCheckErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleCheckErr) {
      return json({ error: `Role check failed: ${roleCheckErr.message}` }, 500);
    }
    if (!callerRole) {
      return json({ error: "Forbidden: admin only" }, 403);
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return json({ error: "user_id is required" }, 400);
    }

       const cleanupSteps: Array<() => Promise<{ error: any }>> = [
      () => admin.from("user_roles").delete().eq("user_id", user_id),
      () => admin.from("coach_clients").delete().eq("client_id", user_id),
      () => admin.from("coach_clients").delete().eq("coach_id", user_id),
      () => admin.from("session_assignments").delete().eq("client_id", user_id),
      () => admin.from("exercises").delete().eq("user_id", user_id),
      () => admin.from("workouts").delete().eq("user_id", user_id),
      () => admin.from("workout_plans").update({ created_by: null }).eq("created_by", user_id),
      () => admin.from("payments").delete().eq("user_id", user_id),
    ];

    for (const step of cleanupSteps) {
      const { error } = await step();
    
      if (error && !error.message?.includes("does not exist")) {
        return json({ error: `Cleanup failed: ${error.message}` }, 500);
      }
    }

    
    const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});