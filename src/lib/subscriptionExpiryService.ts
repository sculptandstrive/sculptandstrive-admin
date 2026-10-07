import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, addDays, isBefore, differenceInDays } from "date-fns";

export interface SubscriptionRecord {
  id?: string;
  user_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  plan_name: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  status: "active" | "expiring_soon" | "expired" | "cancelled";
  reminder_7d_sent?: boolean;
  reminder_1d_sent?: boolean;
  reminder_0d_sent?: boolean;
  created_at?: string;
}

/**
 * Accurately calculates subscription end date based on start date and duration in months.
 */
export function calculateSubscriptionEndDate(
  startDate: Date = new Date(),
  durationMonths: number = 1
): Date {
  const months = Math.max(1, Math.round(durationMonths));
  return addMonths(startDate, months);
}

/**
 * Creates or updates an active subscription for a client in the database.
 */
export async function createOrRenewSubscription({
  userId,
  durationMonths = 1,
  planName,
  startDate = new Date(),
  customerName,
  customerEmail,
  customerPhone,
}: {
  userId: string;
  durationMonths: number;
  planName?: string;
  startDate?: Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<SubscriptionRecord> {
  const endDate = calculateSubscriptionEndDate(startDate, durationMonths);
  const resolvedPlanName =
    planName ||
    `${durationMonths} Month${durationMonths > 1 ? "s" : ""} Plan`;

  const newSub: SubscriptionRecord = {
    user_id: userId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    plan_name: resolvedPlanName,
    duration_months: durationMonths,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    status: "active",
    reminder_7d_sent: false,
    reminder_1d_sent: false,
    reminder_0d_sent: false,
  };

  // 1. Upsert into subscriptions table
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(newSub, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.warn("Could not insert to subscriptions table, updating user_roles fallback:", error.message);
  }

  // 2. Also update user_roles expiry_time for backward compatibility
  try {
    await supabase
      .from("user_roles")
      .update({
        expiry_time: endDate.toISOString(),
        role: "user",
      })
      .eq("user_id", userId);
  } catch (err) {
    console.warn("user_roles sync failed:", err);
  }

  return (data as SubscriptionRecord) || newSub;
}

/**
 * Scans all active subscriptions and dispatches 7-day, 1-day, and on-expiry notifications to customer and admin.
 */
export async function scanAndProcessSubscriptionExpiries(): Promise<{
  processedCount: number;
  details: string[];
}> {
  const now = new Date();
  const details: string[] = [];
  let sentCount = 0;

  try {
    // 1. Fetch subscriptions and profiles
    const [subsRes, profilesRes] = await Promise.all([
      supabase.from("subscriptions").select("*"),
      supabase.from("profiles").select("id, user_id, full_name, email, phone"),
    ]);

    const subs: SubscriptionRecord[] = subsRes.data || [];
    const profiles = profilesRes.data || [];

    const profileMap = new Map<string, any>();
    profiles.forEach((p: any) => {
      const key = String(p.user_id || p.id);
      profileMap.set(key, p);
    });

    for (const sub of subs) {
      if (sub.status === "cancelled") continue;

      const endDate = new Date(sub.end_date);
      const daysRemaining = differenceInDays(endDate, now);
      const isPast = isBefore(endDate, now);
      const profile = profileMap.get(String(sub.user_id)) || {};
      const customerName = sub.customer_name || profile.full_name || profile.email || "Customer";
      const customerEmail = sub.customer_email || profile.email;
      const formattedEndDate = format(endDate, "d MMMM yyyy");

      // -------------------------------------------------------------
      // A. 7-Day Pre-Expiry Notification
      // -------------------------------------------------------------
      if (
        !sub.reminder_7d_sent &&
        !isPast &&
        daysRemaining <= 7 &&
        daysRemaining > 1
      ) {
        const customerMsg = `Your ${sub.plan_name} fitness subscription is ending on ${formattedEndDate}. Please renew your plan to continue your sessions.`;
        const adminMsg = `Customer ${customerName}'s subscription is ending on ${formattedEndDate}. Plan: ${sub.plan_name}.`;

        // Customer in-app notification
        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          recipient_type: "user",
          sender_type: "admin",
          is_completed: false,
          title: `Subscription Ending Soon (${sub.plan_name})`,
          description: customerMsg,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "subscription_expiry_7d",
        });

        // Admin in-app notification
        await supabase.from("notifications").insert({
          recipient_type: "admin",
          sender_type: "system",
          is_completed: false,
          title: `Renewal Alert: ${customerName}`,
          description: adminMsg,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "admin_subscription_expiry_7d",
        });

        // Email dispatch via edge function if available
        triggerEmailNotification({
          to: customerEmail,
          title: `Your ${sub.plan_name} ends on ${formattedEndDate}`,
          message: customerMsg,
        });

        // Mark 7-day reminder sent
        await supabase
          .from("subscriptions")
          .update({
            reminder_7d_sent: true,
            status: "expiring_soon",
          })
          .eq("id", sub.id);

        sentCount++;
        details.push(`Sent 7-day reminder to ${customerName} (ends ${formattedEndDate})`);
      }

      // -------------------------------------------------------------
      // B. 1-Day Urgent Pre-Expiry Notification
      // -------------------------------------------------------------
      if (
        !sub.reminder_1d_sent &&
        !isPast &&
        daysRemaining <= 1 &&
        daysRemaining >= 0
      ) {
        const customerMsg = `Urgent: Your ${sub.plan_name} fitness subscription ends tomorrow on ${formattedEndDate}. Please renew now to keep your workouts uninterrupted!`;
        const adminMsg = `Urgent: Customer ${customerName}'s subscription ends tomorrow on ${formattedEndDate}. Plan: ${sub.plan_name}.`;

        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          recipient_type: "user",
          sender_type: "admin",
          is_completed: false,
          title: `Subscription Ends Tomorrow (${sub.plan_name})`,
          description: customerMsg,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "subscription_expiry_1d",
        });

        await supabase.from("notifications").insert({
          recipient_type: "admin",
          sender_type: "system",
          is_completed: false,
          title: `Final Expiry Alert: ${customerName}`,
          description: adminMsg,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "admin_subscription_expiry_1d",
        });

        triggerEmailNotification({
          to: customerEmail,
          title: `Urgent: Your ${sub.plan_name} ends tomorrow`,
          message: customerMsg,
        });

        await supabase
          .from("subscriptions")
          .update({
            reminder_1d_sent: true,
            status: "expiring_soon",
          })
          .eq("id", sub.id);

        sentCount++;
        details.push(`Sent 1-day reminder to ${customerName} (ends tomorrow)`);
      }

      // -------------------------------------------------------------
      // C. On Expiry Date (0 Days / Expired)
      // -------------------------------------------------------------
      if (!sub.reminder_0d_sent && isPast) {
        const customerMsg = `Your ${sub.plan_name} fitness subscription has expired on ${formattedEndDate}. Please renew your plan to restore full session access.`;
        const adminMsg = `Customer ${customerName}'s subscription expired on ${formattedEndDate}. Plan: ${sub.plan_name}.`;

        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          recipient_type: "user",
          sender_type: "admin",
          is_completed: false,
          title: `Subscription Expired: ${sub.plan_name}`,
          description: customerMsg,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "subscription_expired",
        });

        await supabase.from("notifications").insert({
          recipient_type: "admin",
          sender_type: "system",
          is_completed: false,
          title: `Subscription Expired: ${customerName}`,
          description: adminMsg,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          type: "admin_subscription_expired",
        });

        triggerEmailNotification({
          to: customerEmail,
          title: `Your ${sub.plan_name} has expired`,
          message: customerMsg,
        });

        await supabase
          .from("subscriptions")
          .update({
            reminder_0d_sent: true,
            status: "expired",
          })
          .eq("id", sub.id);

        sentCount++;
        details.push(`Sent expired notification to ${customerName} (expired on ${formattedEndDate})`);
      }
    }

    return { processedCount: sentCount, details };
  } catch (err: any) {
    console.error("Error scanning subscription expiries:", err);
    return { processedCount: 0, details: [err?.message || "Scan failed"] };
  }
}

/**
 * Triggers backend email function
 */
async function triggerEmailNotification({
  to,
  title,
  message,
}: {
  to?: string;
  title: string;
  message: string;
}) {
  if (!to) return;
  try {
    await supabase.functions.invoke("send-notification-email", {
      body: {
        to,
        title,
        description: message,
      },
    });
  } catch (err) {
    console.warn("Email dispatch edge function invoke error:", err);
  }
}
