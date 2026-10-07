import { supabase } from "@/integrations/supabase/client";
import { format, isSameMonth, isAfter } from "date-fns";

export interface ClientAttendanceInfo {
  clientId: string;
  clientName: string;
  clientEmail: string;
  status: "attended" | "missed" | "upcoming";
  attendedAt?: string | null;
  reminderStatus: "sent_same_month" | "sent_next_month" | "sent" | "not_sent";
  nextSession: {
    sessionId?: string;
    title?: string;
    scheduledAt?: string;
    isSameMonth: boolean;
    isNextMonth: boolean;
    formattedDate: string;
    formattedTime: string;
  } | null;
}

export interface SessionAttendanceReport {
  sessionId: string;
  title: string;
  instructor: string;
  platform: string;
  scheduledAt: string;
  isMass: boolean;
  isPast: boolean;
  isLive: boolean;
  totalAssigned: number;
  attendedCount: number;
  missedCount: number;
  clients: ClientAttendanceInfo[];
}

/**
 * Finds the next upcoming scheduled live session for a given user.
 */
export async function findNextSessionForUser(
  userId: string,
  referenceDate: Date = new Date()
) {
  try {
    const { data: futureSessions, error } = await supabase
      .from("sessions")
      .select("*, session_assignments(client_id, user_id)")
      .eq("type", "live")
      .gt("scheduled_at", referenceDate.toISOString())
      .order("scheduled_at", { ascending: true });

    if (error || !futureSessions || futureSessions.length === 0) {
      return null;
    }

    const userNextSessions = futureSessions.filter((s: any) => {
      const isMass =
        s.admin_is_mass === true ||
        s.is_mass === true ||
        s.admin_is_mass == null;
      if (isMass) return true;

      if (s.session_assignments && Array.isArray(s.session_assignments)) {
        return s.session_assignments.some(
          (a: any) => String(a.client_id || a.user_id) === String(userId)
        );
      }
      return false;
    });

    if (userNextSessions.length === 0) return null;

    const nextSess = userNextSessions[0];
    const nextDate = new Date(nextSess.scheduled_at);
    const sameMonth = isSameMonth(nextDate, referenceDate);
    const nextMonth = !sameMonth && isAfter(nextDate, referenceDate);

    return {
      sessionId: nextSess.id,
      title: nextSess.title,
      scheduledAt: nextSess.scheduled_at,
      isSameMonth: sameMonth,
      isNextMonth: nextMonth,
      formattedDate: format(nextDate, "EEE, MMM d, yyyy"),
      formattedTime: format(nextDate, "h:mm a"),
    };
  } catch (err) {
    console.error("Error finding next session for user in admin:", err);
    return null;
  }
}

/**
 * Scans all sessions from past 30 days, detects all missed sessions across all clients,
 * and sends tailored reminders (same month vs next month).
 */
export async function detectAndProcessAllMissedSessions(): Promise<{
  processedCount: number;
  summary: string;
}> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch live sessions in past 30 days (ended at least 15 mins ago)
    const [sessRes, profilesRes, notifsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("type", "live")
        .lt("scheduled_at", new Date(now.getTime() - 15 * 60 * 1000).toISOString())
        .gte("scheduled_at", thirtyDaysAgo.toISOString())
        .order("scheduled_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase
        .from("notifications")
        .select("user_id, related_id, title, description"),
      supabase.from("session_assignments").select("*"),
    ]);

    const pastSessions = sessRes.data || [];
    const profiles = profilesRes.data || [];
    const existingNotifs = notifsRes.data || [];
    const assignments = assignmentsRes.data || [];

    if (pastSessions.length === 0 || profiles.length === 0) {
      return { processedCount: 0, summary: "No past sessions to process." };
    }

    const notifiedKeySet = new Set(
      existingNotifs
        .filter(
          (n: any) =>
            n.related_id &&
            (n.title?.toLowerCase().includes("missed") ||
              n.description?.toLowerCase().includes("missed"))
        )
        .map((n: any) => `${n.user_id}_${n.related_id}`)
    );

    let sentCount = 0;

    for (const session of pastSessions) {
      const isMass =
        session.admin_is_mass === true ||
        session.is_mass === true ||
        session.admin_is_mass == null;

      // Determine clients who were supposed to attend
      const sessionAssignments = assignments.filter(
        (a: any) => String(a.session_id) === String(session.id)
      );

      const targetClients = isMass
        ? profiles
        : profiles.filter((p: any) =>
            sessionAssignments.some(
              (a: any) => String(a.client_id || a.user_id) === String(p.user_id)
            )
          );

      for (const client of targetClients) {
        const clientAssignment = sessionAssignments.find(
          (a: any) =>
            String(a.client_id || a.user_id) === String(client.user_id)
        );

        // If client attended, skip
        if (clientAssignment && clientAssignment.status === "attended") {
          continue;
        }

        const notifyKey = `${client.user_id}_${session.id}`;
        if (notifiedKeySet.has(notifyKey)) {
          continue;
        }

        // Determine next session
        const nextInfo = await findNextSessionForUser(client.user_id, now);

        let reminderTitle = "";
        let reminderDesc = "";

        if (nextInfo && nextInfo.isSameMonth) {
          reminderTitle = `Missed Session: ${session.title}`;
          reminderDesc = `We missed you at "${session.title}". Don't worry—your next session is scheduled for ${nextInfo.formattedDate} at ${nextInfo.formattedTime} this month. Let's keep your streak alive!`;
        } else if (nextInfo && nextInfo.isNextMonth) {
          reminderTitle = `Missed Session & Next Month Plan: ${session.title}`;
          reminderDesc = `We noticed you missed "${session.title}". Your next scheduled session is on ${nextInfo.formattedDate} at ${nextInfo.formattedTime} next month. Mark your calendar and stay ready!`;
        } else {
          reminderTitle = `Missed Session Reminder: ${session.title}`;
          reminderDesc = `We missed you at "${session.title}". Check your studio schedule or contact your coach to book your next workout session!`;
        }

        // 1. Send user notification
        await supabase.from("notifications").insert({
          user_id: client.user_id,
          recipient_type: "user",
          sender_type: "admin",
          is_completed: false,
          title: reminderTitle,
          description: reminderDesc,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          related_id: session.id,
        });

        // 2. Mark session assignment as missed
        await supabase.from("session_assignments").upsert({
          session_id: session.id,
          client_id: client.user_id,
          user_id: client.user_id,
          status: "missed",
        });

        // 3. Log admin activity
        await supabase.from("activities").insert({
          admin_user_name: "Admin System",
          admin_action_detail: `Missed session reminder sent to ${client.full_name || client.email} for "${session.title}" (${
            nextInfo
              ? nextInfo.isSameMonth
                ? `Next: ${nextInfo.formattedDate} (This Month)`
                : `Next: ${nextInfo.formattedDate} (Next Month)`
              : "No upcoming session scheduled"
          })`,
          admin_activity_type: "session",
          admin_created_at: now.toISOString(),
        });

        notifiedKeySet.add(notifyKey);
        sentCount++;
      }
    }

    return {
      processedCount: sentCount,
      summary: `Successfully processed missed sessions and sent ${sentCount} reminder${sentCount === 1 ? "" : "s"}.`,
    };
  } catch (err: any) {
    console.error("Error in detectAndProcessAllMissedSessions:", err);
    return { processedCount: 0, summary: err?.message || "Failed to process." };
  }
}

/**
 * Fetches all sessions along with attendance reports for each client.
 */
export async function fetchSessionsAttendanceReport(): Promise<SessionAttendanceReport[]> {
  try {
    const now = new Date();

    const [sessRes, profilesRes, assignmentsRes, notifsRes, attendanceRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, session_assignments(client_id, user_id, status, created_at)")
        .eq("type", "live")
        .order("scheduled_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("session_assignments").select("*"),
      supabase.from("notifications").select("user_id, related_id, title, description"),
      supabase.from("session_attendance").select("*").then(res => res, () => ({ data: [] })),
    ]);

    const rawSessions = sessRes.data || [];
    const profiles = profilesRes.data || [];
    const assignments = assignmentsRes.data || [];
    const notifs = notifsRes.data || [];
    const attendanceLogs = (attendanceRes as any)?.data || [];

    const notifMap = new Map<string, any>();
    notifs.forEach((n: any) => {
      if (n.related_id && n.user_id) {
        notifMap.set(`${n.user_id}_${n.related_id}`, n);
      }
    });

    const report: SessionAttendanceReport[] = [];

    for (const session of rawSessions) {
      const scheduledDate = session.scheduled_at ? new Date(session.scheduled_at) : new Date();
      const endTime = new Date(scheduledDate.getTime() + 60 * 60 * 1000);
      const isPast = now > endTime;
      const isLive = now >= scheduledDate && now <= endTime;
      const isMass =
        session.admin_is_mass === true ||
        session.is_mass === true ||
        session.admin_is_mass == null;

      const sessionAssignments = assignments.filter(
        (a: any) => String(a.session_id) === String(session.id)
      );

      const clientList = isMass
        ? profiles
        : profiles.filter((p: any) =>
            sessionAssignments.some(
              (a: any) => String(a.client_id || a.user_id) === String(p.user_id)
            )
          );

      let attendedCount = 0;
      let missedCount = 0;
      const clientAttendanceInfos: ClientAttendanceInfo[] = [];

      for (const client of clientList) {
        const assign = sessionAssignments.find(
          (a: any) => String(a.client_id || a.user_id) === String(client.user_id)
        );

        const hasAttendanceRecord = attendanceLogs.some(
          (att: any) =>
            String(att.session_id) === String(session.id) &&
            String(att.user_id) === String(client.user_id)
        );

        let status: "attended" | "missed" | "upcoming" = "upcoming";
        if (assign?.status === "attended" || hasAttendanceRecord) {
          status = "attended";
          attendedCount++;
        } else if (isPast) {
          status = "missed";
          missedCount++;
        } else {
          status = "upcoming";
        }

        const notif = notifMap.get(`${client.user_id}_${session.id}`);
        let reminderStatus: "sent_same_month" | "sent_next_month" | "sent" | "not_sent" = "not_sent";
        if (notif) {
          if (notif.description?.toLowerCase().includes("this month")) {
            reminderStatus = "sent_same_month";
          } else if (notif.description?.toLowerCase().includes("next month")) {
            reminderStatus = "sent_next_month";
          } else {
            reminderStatus = "sent";
          }
        }

        // Get next session for client
        const nextInfo = await findNextSessionForUser(client.user_id, scheduledDate);

        clientAttendanceInfos.push({
          clientId: client.user_id,
          clientName: client.full_name || "Client",
          clientEmail: client.email || "",
          status,
          attendedAt: assign?.created_at || null,
          reminderStatus,
          nextSession: nextInfo,
        });
      }

      report.push({
        sessionId: session.id,
        title: session.title,
        instructor: session.instructor || "Coach",
        platform: session.platform || "live",
        scheduledAt: session.scheduled_at,
        isMass,
        isPast,
        isLive,
        totalAssigned: clientList.length,
        attendedCount,
        missedCount,
        clients: clientAttendanceInfos,
      });
    }

    return report;
  } catch (err) {
    console.error("Error fetching attendance report:", err);
    return [];
  }
}

/**
 * Manually marks a client's attendance status (Attended or Missed).
 */
export async function markClientAttendance(
  sessionId: string,
  clientId: string,
  status: "attended" | "missed"
) {
  try {
    const { error } = await supabase.from("session_assignments").upsert({
      session_id: sessionId,
      client_id: clientId,
      user_id: clientId,
      status,
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error marking attendance:", err);
    throw err;
  }
}

/**
 * Manually sends or re-sends a missed session reminder to a client.
 */
export async function sendManualMissedReminder(
  sessionId: string,
  client: { user_id: string; full_name?: string; email?: string },
  sessionTitle: string,
  sessionScheduledAt: string
) {
  try {
    const now = new Date();
    const refDate = new Date(sessionScheduledAt);
    const nextInfo = await findNextSessionForUser(client.user_id, now);

    let reminderTitle = "";
    let reminderDesc = "";

    if (nextInfo && nextInfo.isSameMonth) {
      reminderTitle = `Missed Session: ${sessionTitle}`;
      reminderDesc = `We missed you at "${sessionTitle}". Don't worry—your next session is scheduled for ${nextInfo.formattedDate} at ${nextInfo.formattedTime} this month. Let's keep your streak alive!`;
    } else if (nextInfo && nextInfo.isNextMonth) {
      reminderTitle = `Missed Session & Next Month Plan: ${sessionTitle}`;
      reminderDesc = `We noticed you missed "${sessionTitle}". Your next scheduled session is on ${nextInfo.formattedDate} at ${nextInfo.formattedTime} next month. Mark your calendar and stay ready!`;
    } else {
      reminderTitle = `Missed Session Reminder: ${sessionTitle}`;
      reminderDesc = `We missed you at "${sessionTitle}". Check your studio schedule or contact your coach to book your next workout session!`;
    }

    // Insert user notification
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: client.user_id,
      recipient_type: "user",
      sender_type: "admin",
      is_completed: false,
      title: reminderTitle,
      description: reminderDesc,
      notification_date: now.toISOString().split("T")[0],
      created_at: now.toISOString(),
      related_id: sessionId,
    });

    if (notifErr) throw notifErr;

    // Mark status as missed in session_assignments
    await supabase.from("session_assignments").upsert({
      session_id: sessionId,
      client_id: client.user_id,
      user_id: client.user_id,
      status: "missed",
    });

    // Log admin activity
    await supabase.from("activities").insert({
      admin_user_name: "Admin",
      admin_action_detail: `Manually dispatched missed session reminder to ${client.full_name || client.email} for "${sessionTitle}"`,
      admin_activity_type: "session",
      admin_created_at: now.toISOString(),
    });

    return {
      success: true,
      nextInfo,
    };
  } catch (err) {
    console.error("Error sending manual reminder:", err);
    throw err;
  }
}
