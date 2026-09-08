import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  console.log("Function invoked");

  try {
    const payload = await req.json();
    console.log("Payload received:", JSON.stringify(payload));

    const notification = payload.record;

    if (!notification?.user_id) {
      console.log("No user_id found, skipping");
      return new Response(JSON.stringify({ skipped: "no user_id" }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      notification.user_id
    );

    if (userError || !userData?.user?.email) {
      console.log("User lookup failed:", JSON.stringify(userError));
      return new Response(JSON.stringify({ error: "user email not found" }), { status: 200 });
    }

    const email = userData.user.email;
    console.log("Sending email to:", email);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: Bearer $RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "notifications@sculptandstrive.com",
        to: email,
        subject: notification.title || "New Notification",
        html: <p>${notification.description || ""}</p>,
      }),
    });

    const emailResult = await emailRes.json();
    console.log("Resend response:", emailRes.status, JSON.stringify(emailResult));

    return new Response(JSON.stringify({ success: true, emailResult }), { status: 200 });
  } catch (err) {
    console.log("ERROR:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
