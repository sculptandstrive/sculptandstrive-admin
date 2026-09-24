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

    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id) {
      return json({ error: "user_id is required" }, 400);
    }
    if (user_id === caller.id) {
      return json({ error: "Cannot delete your own admin account" }, 400);
    }

    // Comprehensive list of cleanup operations for all relational tables
    const cleanupSteps: Array<() => Promise<{ error: any }>> = [
      // 1. Group memberships & Coaching assignments
      () => admin.from("group_members").delete().eq("user_id", user_id),
      () => admin.from("coach_clients").delete().eq("client_id", user_id),
      () => admin.from("coach_clients").delete().eq("coach_id", user_id),
      () => admin.from("workout_groups").update({ coach_id: null }).eq("coach_id", user_id),

      // 2. Session assignments & Sessions
      () => admin.from("session_assignments").delete().eq("client_id", user_id),
      () => admin.from("session_assignments").delete().eq("coach_id", user_id),
      () => admin.from("sessions").delete().eq("coach_id", user_id),
      () => admin.from("sessions").delete().eq("user_id", user_id),

      // 3. Workouts, assignments, logs & Exercises
      () => admin.from("client_workout_assignments").delete().eq("user_id", user_id),
      () => admin.from("client_workout_assignments").delete().eq("client_id", user_id),
      () => admin.from("exercise_logs").delete().eq("user_id", user_id),
      () => admin.from("workout_progress").delete().eq("user_id", user_id),
      () => admin.from("workouts").delete().eq("user_id", user_id),
      () => admin.from("exercises").delete().eq("user_id", user_id),
      () => admin.from("workout_plans").update({ created_by: null }).eq("created_by", user_id),

      // 4. Checkins, Measurements & Health History
      () => admin.from("weekly_checkins").delete().eq("user_id", user_id),
      () => admin.from("health_history").delete().eq("user_id", user_id),
      () => admin.from("starting_measurements").delete().eq("user_id", user_id),
      () => admin.from("current_measurements").delete().eq("user_id", user_id),
      () => admin.from("progress_records").delete().eq("user_id", user_id),
      () => admin.from("progress_photos").delete().eq("user_id", user_id),

      // 5. Nutrition, Hydration, Calculations & Meal plans
      () => admin.from("nutrition_logs").delete().eq("user_id", user_id),
      () => admin.from("water_intake").delete().eq("user_id", user_id),
      () => admin.from("user_meal_plans").delete().eq("user_id", user_id),
      () => admin.from("nutrition_requirements").delete().eq("user_id", user_id),
      () => admin.from("macro_result").delete().eq("user_id", user_id),
      () => admin.from("hf_data").delete().eq("user_id", user_id),
      () => admin.from("bmr_data").delete().eq("user_id", user_id),

      // 6. Tickets, Notifications, Activities, Payments & Roles
      () => admin.from("ticket_replies").delete().eq("user_id", user_id),
      () => admin.from("ticket_messages").delete().eq("user_id", user_id),
      () => admin.from("tickets").delete().eq("user_id", user_id),
      () => admin.from("notifications").delete().eq("user_id", user_id),
      () => admin.from("notifications").delete().eq("sender_id", user_id),
      () => admin.from("notification_preferences").delete().eq("user_id", user_id),
      () => admin.from("activities").delete().eq("id", user_id),
      () => admin.from("activities").delete().eq("user_id", user_id),
      () => admin.from("payments").delete().eq("user_id", user_id),
      () => admin.from("user_roles").delete().eq("user_id", user_id),

      // 7. Profile details & Profiles
      () => admin.from("profile_details").delete().eq("user_id", user_id),
      () => admin.from("profiles").delete().eq("id", user_id),
      () => admin.from("profiles").delete().eq("user_id", user_id),
    ];

    for (const step of cleanupSteps) {
      try {
        const { error } = await step();
        if (error) {
          const msg = error.message?.toLowerCase() || "";
          // Ignore tables/columns that may not exist in specific environments
          if (
            !msg.includes("does not exist") &&
            !msg.includes("not found") &&
            !msg.includes("schema")
          ) {
            console.warn("Cleanup step notice:", error.message);
          }
        }
      } catch (e: any) {
        console.warn("Cleanup exception ignored:", e?.message);
      }
    }

    // Clean up user storage assets safely if present
    try {
      await admin.storage.from("progress_photos").remove([`${user_id}`]);
      await admin.storage.from("user-images").remove([`${user_id}`]);
    } catch {}

    // Delete the Auth account
    const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});