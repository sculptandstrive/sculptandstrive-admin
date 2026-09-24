import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const notification = payload.record || payload;

    const isAdminNotification = notification?.recipient_type === "admin";
    const targetUserId = notification?.user_id;

    if (!isAdminNotification && !targetUserId) {
      return json({ skipped: "no recipient specified" }, 200);
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set in environment. Skipping email dispatch.");
      return json({ skipped: "RESEND_API_KEY not configured" }, 200);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let email: string;

    if (isAdminNotification) {
      email = Deno.env.get("ADMIN_EMAIL") || "notifications@sculptandstrive.com";
    } else {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        targetUserId
      );

      if (userError || !userData?.user?.email) {
        return json({ error: "User email not found" }, 200);
      }

      email = userData.user.email;
    }

    const title = notification.title || "New Notification";
    const description = notification.description || "";
    const htmlBody = buildEmailHtml(title, description);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sculpt And Strive <notifications@sculptandstrive.com>",
        to: email,
        subject: title,
        html: htmlBody,
      }),
    });

    const emailResult = await emailRes.json().catch(() => ({}));

    if (!emailRes.ok) {
      console.error("Resend API error:", emailRes.status, emailResult);
      return json({ error: "Failed to send email", details: emailResult }, emailRes.status);
    }

    return json({ success: true, emailResult }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("send-notification-email error:", message);
    return json({ error: message }, 500);
  }
});