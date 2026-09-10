import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildEmailHtml(title: string, description: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; padding: 32px 0;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background-color: #07AC7D; padding: 20px 24px;">
        <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 700;">Sculpt And Strive</h1>
      </div>
      <div style="padding: 28px 24px;">
        <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px 0;">${title}</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">${description}</p>
      </div>
      <div style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
          You're receiving this because you have an account with Sculpt And Strive.
          <br/>
          <a href="https://sculptandstrive.com" style="color: #07AC7D; text-decoration: none;">Manage notification preferences</a>
        </p>
      </div>
    </div>
  </div>
  `;
}

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

    let email: string;

    if (notification.recipient_type === "admin") {
      email = "lailakhuntia450@gmail.com";
    } else {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        notification.user_id
      );

      if (userError || !userData?.user?.email) {
        console.log("User lookup failed:", JSON.stringify(userError));
        return new Response(JSON.stringify({ error: "user email not found" }), { status: 200 });
      }

      email = userData.user.email;
    }

    console.log("Sending email to:", email);

    const htmlBody = buildEmailHtml(
      notification.title || "New Notification",
      notification.description || ""
    );

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sculpt And Strive <notifications@sculptandstrive.com>",
        to: email,
        subject: notification.title || "New Notification",
        html: htmlBody,
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