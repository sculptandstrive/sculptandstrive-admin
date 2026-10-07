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
    const [sessRes, assignRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .order("scheduled_at", { ascending: true }),
      supabase.from("session_assignments").select("*"),
    ]);

    const allSessions = (sessRes.data || []).filter((s: any) => {
      if (s.type === "tutorial") return false;
      const sched = s.scheduled_at ? new Date(s.scheduled_at) : null;
      return sched && sched > referenceDate;
    });

    const assignments = assignRes.data || [];

    if (allSessions.length === 0) return null;

    const userNextSessions = allSessions.filter((s: any) => {
      const isMass =
        s.admin_is_mass === true ||
        s.is_mass === true ||
        s.admin_is_mass == null;
      if (isMass) return true;

      return assignments.some(
        (a: any) =>
          String(a.session_id) === String(s.id) &&
          (String(a.client_id) === String(userId) || String(a.user_id) === String(userId))
      );
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

    // 1. Fetch sessions, profiles, notifications, assignments
    const [sessRes, profilesRes, notifsRes, assignmentsRes, attendanceRes] = await Promise.all([
      supabase.from("sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("notifications").select("user_id, related_id, title, description"),
      supabase.from("session_assignments").select("*"),
      supabase.from("session_attendance").select("*").then(res => res, () => ({ data: [] })),
    ]);

    const allSessions = sessRes.data || [];
    const profiles = profilesRes.data || [];
    const existingNotifs = notifsRes.data || [];
    const assignments = assignmentsRes.data || [];
    const attendanceLogs = (attendanceRes as any)?.data || [];

    // Filter past sessions
    const pastSessions = allSessions.filter((s: any) => {
      if (s.type === "tutorial") return false;
      const sched = s.scheduled_at ? new Date(s.scheduled_at) : new Date(s.created_at);
      return sched < new Date(now.getTime() - 15 * 60 * 1000) && sched >= thirtyDaysAgo;
    });

    if (pastSessions.length === 0 || profiles.length === 0) {
      return { processedCount: 0, summary: "No ended sessions found to process." };
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

      const sessionAssignments = assignments.filter(
        (a: any) => String(a.session_id) === String(session.id)
      );

      const targetClients = isMass
        ? profiles
        : profiles.filter((p: any) => {
            const pId = String(p.user_id || p.id);
            return sessionAssignments.some(
              (a: any) => String(a.client_id || a.user_id) === pId
            );
          });

      for (const client of targetClients) {
        const clientId = String(client.user_id || client.id);

        const clientAssignment = sessionAssignments.find(
          (a: any) => String(a.client_id || a.user_id) === clientId
        );

        const hasAttended =
          clientAssignment?.status === "attended" ||
          attendanceLogs.some(
            (att: any) =>
              String(att.session_id) === String(session.id) &&
              String(att.user_id || att.client_id) === clientId &&
              att.status === "attended"
          );

        if (hasAttended) {
          continue;
        }

        const notifyKey = `${clientId}_${session.id}`;
        if (notifiedKeySet.has(notifyKey)) {
          continue;
        }

        // Determine next session
        const nextInfo = await findNextSessionForUser(clientId, now);

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

        // 1. Send user notification (website in-app)
        await supabase.from("notifications").insert({
          user_id: clientId,
          recipient_type: "user",
          sender_type: "admin",
          is_completed: false,
          title: reminderTitle,
          description: reminderDesc,
          notification_date: now.toISOString().split("T")[0],
          created_at: now.toISOString(),
          related_id: session.id,
        });

        // 1b. Dispatch Email notification directly to client's inbox
        await triggerMissedSessionEmail({
          to: client.email,
          userId: clientId,
          clientName: client.full_name || client.email?.split("@")[0] || "Client",
          sessionTitle: session.title,
          missedDate: session.scheduled_at
            ? format(new Date(session.scheduled_at), "MMM d, yyyy 'at' h:mm a")
            : undefined,
          nextSession: nextInfo,
        });

        // 2. Mark session assignment as missed
        await supabase.from("session_assignments").upsert({
          session_id: session.id,
          client_id: clientId,
          user_id: clientId,
          status: "missed",
        });

        // 3. Log admin activity
        await supabase.from("activities").insert({
          admin_user_name: "Admin System",
          admin_action_detail: `Missed session reminder & email sent to ${client.full_name || client.email || "Client"} for "${session.title}" (${
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

    // Query separately for maximum resilience
    const [sessRes, profilesRes, assignmentsRes, notifsRes, attendanceRes] = await Promise.all([
      supabase.from("sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("session_assignments").select("*"),
      supabase.from("notifications").select("user_id, related_id, title, description"),
      supabase.from("session_attendance").select("*").then(res => res, () => ({ data: [] })),
    ]);

    // Keep all non-tutorial sessions
    const rawSessions = (sessRes.data || []).filter((s: any) => s.type !== "tutorial");
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
      const scheduledDate = session.scheduled_at ? new Date(session.scheduled_at) : new Date(session.created_at || Date.now());
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
        : profiles.filter((p: any) => {
            const pId = String(p.user_id || p.id);
            return sessionAssignments.some(
              (a: any) => String(a.client_id || a.user_id) === pId
            );
          });

      let attendedCount = 0;
      let missedCount = 0;
      const clientAttendanceInfos: ClientAttendanceInfo[] = [];

      for (const client of clientList) {
        const clientId = String(client.user_id || client.id);

        const assign = sessionAssignments.find(
          (a: any) => String(a.client_id || a.user_id) === clientId
        );

        const hasAttendanceRecord = attendanceLogs.some(
          (att: any) =>
            String(att.session_id) === String(session.id) &&
            String(att.user_id || att.client_id) === clientId &&
            att.status === "attended"
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

        const notif = notifMap.get(`${clientId}_${session.id}`);
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
        const nextInfo = await findNextSessionForUser(clientId, scheduledDate);

        clientAttendanceInfos.push({
          clientId,
          clientName: client.full_name || client.email?.split("@")[0] || "Client",
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
        scheduledAt: session.scheduled_at || session.created_at,
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
 * Dispatches an email notification to the client regarding their missed session
 * and their upcoming scheduled workout date.
 */
export async function triggerMissedSessionEmail({
  to,
  userId,
  clientName,
  sessionTitle,
  missedDate,
  nextSession,
}: {
  to?: string;
  userId: string;
  clientName: string;
  sessionTitle: string;
  missedDate?: string;
  nextSession?: {
    title?: string;
    formattedDate: string;
    formattedTime: string;
    isSameMonth: boolean;
    isNextMonth: boolean;
  } | null;
}) {
  if (!to && !userId) return;

  let title = `Missed Workout Session: ${sessionTitle}`;
  let description = "";

  if (nextSession && nextSession.isSameMonth) {
    title = `Missed Workout: ${sessionTitle} (Next Session: ${nextSession.formattedDate})`;
    description = `Hi ${clientName},\n\nWe missed you at "${sessionTitle}"${missedDate ? ` scheduled for ${missedDate}` : ""}.\n\nDon't worry—your next session is scheduled for **${nextSession.formattedDate} at ${nextSession.formattedTime}** (${nextSession.title || "Workout Session"}) this month.\n\nLet's keep your streak alive and crush your fitness goals!`;
  } else if (nextSession && nextSession.isNextMonth) {
    title = `Missed Workout: ${sessionTitle} (Next Month Schedule: ${nextSession.formattedDate})`;
    description = `Hi ${clientName},\n\nWe noticed you missed "${sessionTitle}"${missedDate ? ` scheduled for ${missedDate}` : ""}.\n\nYour next scheduled workout date moves into next month on **${nextSession.formattedDate} at ${nextSession.formattedTime}** (${nextSession.title || "Workout Session"}).\n\nMark your calendar and get ready to stay on track!`;
  } else {
    title = `Missed Workout Session Reminder: ${sessionTitle}`;
    description = `Hi ${clientName},\n\nWe missed you at "${sessionTitle}"${missedDate ? ` scheduled for ${missedDate}` : ""}.\n\nPlease check your studio dashboard or contact your coach to book your next workout session!`;
  }

  try {
    const { error } = await supabase.functions.invoke("send-notification-email", {
      body: {
        to,
        email: to,
        user_id: userId,
        recipient_type: "user",
        title,
        description,
        action_url: "https://sculptandstrive.com/sessions",
        action_text: "View My Workout Schedule",
      },
    });

    if (error) {
      console.warn("send-notification-email edge function notice:", error);
    }
  } catch (err) {
    console.warn("Failed to dispatch missed session email via edge function:", err);
  }
}

/**
 * Manually sends or re-sends a missed session reminder & email to a client.
 */
export async function sendManualMissedReminder(
  sessionId: string,
  client: { user_id: string; full_name?: string; email?: string },
  sessionTitle: string,
  sessionScheduledAt: string
) {
  try {
    const now = new Date();
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

    // 1. Insert user notification (in-app website)
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

    // 2. Dispatch Email to client's inbox
    await triggerMissedSessionEmail({
      to: client.email,
      userId: client.user_id,
      clientName: client.full_name || client.email?.split("@")[0] || "Client",
      sessionTitle,
      missedDate: sessionScheduledAt
        ? format(new Date(sessionScheduledAt), "MMM d, yyyy 'at' h:mm a")
        : undefined,
      nextSession: nextInfo,
    });

    // 3. Mark status as missed in session_assignments
    await supabase.from("session_assignments").upsert({
      session_id: sessionId,
      client_id: client.user_id,
      user_id: client.user_id,
      status: "missed",
    });

    // 4. Log admin activity
    await supabase.from("activities").insert({
      admin_user_name: "Admin",
      admin_action_detail: `Manually dispatched missed session reminder & email to ${client.full_name || client.email || "Client"} for "${sessionTitle}"`,
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

/**
 * Creates a demo live session in the past so the admin can test attendance and missed reminders immediately.
 */
export async function createDemoSessionForTesting(): Promise<boolean> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 1. Create a past session (ended)
    const { data: pastSess, error: err1 } = await supabase
      .from("sessions")
      .insert({
        title: "Morning HIIT & Core (Demo Workout)",
        instructor: "Coach Alex",
        platform: "google_meet",
        type: "live",
        meeting_link: "https://meet.google.com/abc-defg-hij",
        scheduled_at: yesterday.toISOString(),
        admin_is_mass: true,
        admin_status: "completed",
      })
      .select()
      .single();

    if (err1) throw err1;

    // 2. Create an upcoming session (for next session reminder test)
    await supabase.from("sessions").insert({
      title: "Strength & Conditioning (Upcoming Class)",
      instructor: "Coach Sarah",
      platform: "google_meet",
      type: "live",
      meeting_link: "https://meet.google.com/xyz-uvwx-rst",
      scheduled_at: tomorrow.toISOString(),
      admin_is_mass: true,
      admin_status: "upcoming",
    });

    return true;
  } catch (err) {
    console.error("Error creating demo session:", err);
    throw err;
  }
}
