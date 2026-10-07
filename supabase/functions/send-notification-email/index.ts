import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "notifications@sculptandstrive.com";

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

function buildEmailHtml(
  title: string,
  description: string,
  actionUrl: string = "https://sculptandstrive.com/sessions",
  actionText: string = "View Studio Schedule"
) {
  // Convert basic markdown formatting like **bold** and newlines to HTML
  const formattedDesc = description
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 36px 12px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #07AC7D 0%, #0BBF8B 100%); padding: 24px 28px;">
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sculpt And Strive</h1>
        <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 4px 0 0 0; font-weight: 600;">Fitness & Wellness Studio</p>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 28px 24px 28px;">
        <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 14px 0; font-weight: 700; line-height: 1.4;">${title}</h2>
        <div style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0;">${formattedDesc}</div>

        <!-- Call to Action Button -->
        <div style="margin-top: 26px;">
          <a href="${actionUrl}" style="display: inline-block; background-color: #07AC7D; color: #ffffff; padding: 12px 24px; font-weight: 700; font-size: 13px; text-decoration: none; border-radius: 10px; box-shadow: 0 2px 6px rgba(7,172,125,0.3);">
            ${actionText}
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
          You're receiving this because you have an active training account with Sculpt And Strive.
          <br/>
          <a href="https://sculptandstrive.com" style="color: #07AC7D; text-decoration: none; font-weight: 600;">Sculpt And Strive Member Portal</a>
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
    const directEmail = notification?.to || notification?.email || payload?.to || payload?.email;

    if (!isAdminNotification && !targetUserId && !directEmail) {
      return json({ skipped: "no recipient specified" }, 200);
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set in environment. Skipping email dispatch.");
      return json({ skipped: "RESEND_API_KEY not configured" }, 200);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let email: string = "";

    if (isAdminNotification) {
      email = Deno.env.get("ADMIN_EMAIL") || "sculptandstrive@gmail.com";
    } else if (directEmail) {
      email = directEmail;
    } else if (targetUserId) {
      // 1. Try finding in public.profiles first
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`)
        .maybeSingle();

      if (profile?.email) {
        email = profile.email;
      } else {
        // 2. Fall back to auth.admin.getUserById
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          targetUserId
        );
        if (!userError && userData?.user?.email) {
          email = userData.user.email;
        }
      }
    }

    if (!email) {
      return json({ error: "Recipient email could not be resolved" }, 200);
    }

    const title = notification.title || payload.title || "New Workout Notification";
    const description = notification.description || payload.description || "";
    const actionUrl = notification.action_url || payload.action_url || "https://sculptandstrive.com/sessions";
    const actionText = notification.action_text || payload.action_text || "View Studio Schedule";

    const htmlBody = buildEmailHtml(title, description, actionUrl, actionText);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Sculpt And Strive <${SENDER_EMAIL}>`,
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

    return json({ success: true, emailResult, to: email }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("send-notification-email error:", message);
    return json({ error: message }, 500);
  }
});
