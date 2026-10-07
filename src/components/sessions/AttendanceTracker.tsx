import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Bell,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchSessionsAttendanceReport,
  detectAndProcessAllMissedSessions,
  markClientAttendance,
  sendManualMissedReminder,
  createDemoSessionForTesting,
  SessionAttendanceReport,
} from "@/lib/missedSessionService";

export const AttendanceTracker: React.FC = () => {
  const [reports, setReports] = useState<SessionAttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAuto, setProcessingAuto] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "missed" | "past" | "upcoming">("all");
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchSessionsAttendanceReport();
      setReports(data);
      // Auto-expand sessions that have missed clients
      const initialExpanded = new Set<string>();
      data.forEach((s) => {
        if (s.missedCount > 0) {
          initialExpanded.add(s.sessionId);
        }
      });
      setExpandedSessionIds(initialExpanded);
    } catch (err: any) {
      toast.error(err.message || "Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleExpand = (sessionId: string) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleScanAndNotifyAll = async () => {
    try {
      setProcessingAuto(true);
      const res = await detectAndProcessAllMissedSessions();
      toast.success(res.summary);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process missed session reminders");
    } finally {
      setProcessingAuto(false);
    }
  };

  const handleCreateDemo = async () => {
    try {
      setCreatingDemo(true);
      await createDemoSessionForTesting();
      toast.success("Created demo live sessions (past & upcoming)!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create demo session");
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleSendManualReminder = async (
    sessionId: string,
    client: { clientId: string; clientName: string; clientEmail: string },
    sessionTitle: string,
    scheduledAt: string
  ) => {
    const actionKey = `remind_${sessionId}_${client.clientId}`;
    try {
      setActionInProgress(actionKey);
      await sendManualMissedReminder(
        sessionId,
        {
          user_id: client.clientId,
          full_name: client.clientName,
          email: client.clientEmail,
        },
        sessionTitle,
        scheduledAt
      );
      toast.success(`Reminder & email dispatched to ${client.clientName}!`);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reminder");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleAttendance = async (
    sessionId: string,
    clientId: string,
    currentStatus: "attended" | "missed" | "upcoming"
  ) => {
    const actionKey = `toggle_${sessionId}_${clientId}`;
    const newStatus = currentStatus === "attended" ? "missed" : "attended";
    try {
      setActionInProgress(actionKey);
      await markClientAttendance(sessionId, clientId, newStatus);
      toast.success(`Marked as ${newStatus}`);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update attendance");
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter and search
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clients.some(
        (c) =>
          c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.clientEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );

    if (!matchesSearch) return false;

    if (filterType === "missed") return r.missedCount > 0;
    if (filterType === "past") return r.isPast;
    if (filterType === "upcoming") return !r.isPast;
    return true;
  });

  // Calculate statistics
  const totalSessions = reports.length;
  const totalAssignedSlots = reports.reduce((acc, r) => acc + r.totalAssigned, 0);
  const totalAttended = reports.reduce((acc, r) => acc + r.attendedCount, 0);
  const totalMissed = reports.reduce((acc, r) => acc + r.missedCount, 0);
  const attendanceRate =
    totalAssignedSlots > 0 ? Math.round((totalAttended / totalAssignedSlots) * 100) : 0;

  let sameMonthReminders = 0;
  let nextMonthReminders = 0;
  reports.forEach((r) => {
    r.clients.forEach((c) => {
      if (c.reminderStatus === "sent_same_month") sameMonthReminders++;
      if (c.reminderStatus === "sent_next_month") nextMonthReminders++;
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[22px] p-5 border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18),-4px_-4px_12px_rgba(255,255,255,0.98)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF7F5] border border-[#BDEADE] flex items-center justify-center shrink-0 text-[#08A982]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#6F849A] uppercase tracking-wider">
              Total Live Sessions
            </p>
            <h3 className="text-2xl font-black text-[#10203B]">{totalSessions}</h3>
            <p className="text-[11px] text-[#6F849A] font-medium">
              {totalAssignedSlots} client slots tracked
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18),-4px_-4px_12px_rgba(255,255,255,0.98)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#6F849A] uppercase tracking-wider">
              Attendance Rate
            </p>
            <h3 className="text-2xl font-black text-emerald-600">{attendanceRate}%</h3>
            <p className="text-[11px] text-[#6F849A] font-medium">
              {totalAttended} total session check-ins
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18),-4px_-4px_12px_rgba(255,255,255,0.98)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#6F849A] uppercase tracking-wider">
              Missed Sessions
            </p>
            <h3 className="text-2xl font-black text-rose-600">{totalMissed}</h3>
            <p className="text-[11px] text-rose-500 font-bold">
              Detected by system
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[22px] p-5 border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18),-4px_-4px_12px_rgba(255,255,255,0.98)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#6F849A] uppercase tracking-wider">
              Reminders Sent
            </p>
            <h3 className="text-2xl font-black text-amber-600">
              {sameMonthReminders + nextMonthReminders}
            </h3>
            <p className="text-[11px] text-[#6F849A] font-medium">
              {sameMonthReminders} This Month • {nextMonthReminders} Next Month
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-[22px] p-4 sm:p-5 border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18),-4px_-4px_12px_rgba(255,255,255,0.98)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#6F849A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search session title, coach, or client..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F4FAF8] border border-white/80 rounded-xl text-xs sm:text-sm font-semibold text-[#10203B] placeholder:text-[#6F849A] outline-none shadow-[inset_1px_1px_2px_rgba(160,185,180,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.9)]"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#F4FAF8] p-1 rounded-xl border border-white/80 shadow-[inset_1px_1px_2px_rgba(160,185,180,0.15)]">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === "all"
                  ? "bg-white text-[#08A982] shadow-sm"
                  : "text-[#6F849A] hover:text-[#10203B]"
              }`}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setFilterType("missed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === "missed"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-[#6F849A] hover:text-rose-600"
              }`}
            >
              Has Missed ({reports.filter((r) => r.missedCount > 0).length})
            </button>
            <button
              onClick={() => setFilterType("past")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === "past"
                  ? "bg-white text-[#10203B] shadow-sm"
                  : "text-[#6F849A] hover:text-[#10203B]"
              }`}
            >
              Past
            </button>
            <button
              onClick={() => setFilterType("upcoming")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === "upcoming"
                  ? "bg-white text-[#10203B] shadow-sm"
                  : "text-[#6F849A] hover:text-[#10203B]"
              }`}
            >
              Upcoming
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={loadData}
            disabled={loading}
            className="h-10 px-4 rounded-xl text-xs font-bold bg-[#F4FAF8] text-[#10203B] hover:bg-[#EEF7F5] border border-white/80 shadow-sm flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#08A982] ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleScanAndNotifyAll}
            disabled={processingAuto}
            className="h-10 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#08A982] to-[#0CC194] text-white shadow-[0_3px_10px_rgba(8,169,130,0.3)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${processingAuto ? "animate-spin" : ""}`} />
            <span>{processingAuto ? "Scanning & Notifying..." : "Scan & Auto-Notify Missed"}</span>
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="bg-white rounded-[22px] p-12 text-center border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18)]">
          <RefreshCw className="w-8 h-8 text-[#08A982] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#10203B]">Analyzing session attendance & missed schedules...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-[22px] p-10 sm:p-14 text-center border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18)] flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E6F7F3] border border-[#BDEADE] flex items-center justify-center text-[#08A982] mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-[#10203B]">No Live Sessions Found in Database</h3>
          <p className="text-xs text-[#6F849A] max-w-md mt-1 mb-6 leading-relaxed">
            Attendance and missed session tracking operate on live workout sessions. You can create a live session via "+ Add Session" or click below to generate demo sessions (past & upcoming) to preview attendance tracking and dynamic month reminders right away.
          </p>
          <button
            onClick={handleCreateDemo}
            disabled={creatingDemo}
            className="h-11 px-5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#08A982] to-[#0CC194] text-white shadow-[0_3px_10px_rgba(8,169,130,0.3)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${creatingDemo ? "animate-spin" : ""}`} />
            <span>{creatingDemo ? "Generating Demo Sessions..." : "Generate Demo Live & Missed Sessions"}</span>
          </button>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-[22px] p-12 text-center border border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18)] flex flex-col items-center">
          <AlertCircle className="w-8 h-8 text-[#6F849A] mx-auto mb-3" />
          <p className="text-base font-bold text-[#10203B]">No sessions matched your criteria</p>
          <p className="text-xs text-[#6F849A] mt-1">Try resetting the search or filter</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
            }}
            className="mt-4 px-4 py-2 text-xs font-bold text-[#08A982] bg-[#E6F7F3] rounded-xl hover:bg-[#D5F2EB] transition-all"
          >
            Clear Filter & Search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isExpanded = expandedSessionIds.has(report.sessionId);
            const scheduledDate = new Date(report.scheduledAt);
            const dateString = isNaN(scheduledDate.getTime())
              ? "TBD"
              : scheduledDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
            const timeString = isNaN(scheduledDate.getTime())
              ? "00:00"
              : scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div
                key={report.sessionId}
                className={`bg-white rounded-[22px] border transition-all overflow-hidden ${
                  report.missedCount > 0
                    ? "border-amber-200/90 shadow-[5px_5px_18px_rgba(217,119,6,0.12),-4px_-4px_12px_rgba(255,255,255,0.98)]"
                    : "border-white/90 shadow-[5px_5px_16px_rgba(150,175,170,0.18),-4px_-4px_12px_rgba(255,255,255,0.98)]"
                }`}
              >
                {/* Session Header Card */}
                <div
                  onClick={() => handleToggleExpand(report.sessionId)}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFDFD] transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#F0FAF7] border border-white/80 shadow-[inset_1.5px_1.5px_3px_rgba(160,185,180,0.25)] flex items-center justify-center shrink-0">
                      <span className="text-base font-extrabold text-[#08B594]">
                        {report.instructor[0] || report.title[0] || "S"}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-base text-[#10203B] tracking-tight">
                          {report.title}
                        </h4>

                        {report.isLive && (
                          <span className="bg-gradient-to-r from-[#0CC194] to-[#08A982] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                            ● LIVE NOW
                          </span>
                        )}

                        {report.isPast && (
                          <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] border border-slate-200 px-2 py-0.5 rounded-full font-bold uppercase">
                            PAST
                          </span>
                        )}

                        {report.isMass ? (
                          <span className="text-[10px] bg-[#F1F5F9] text-[#475569] border border-slate-200 px-2 py-0.5 rounded-full font-bold uppercase">
                            PUBLIC
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-2 py-0.5 rounded-full font-bold uppercase">
                            1-ON-1
                          </span>
                        )}

                        <span className="text-[10px] bg-[#E6F7F3] text-[#08B594] border border-[#BDEADE] px-2 py-0.5 rounded-full font-bold uppercase">
                          {report.platform}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-[#6F849A]">
                        Coach {report.instructor} • {dateString} at {timeString}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Badges & Action */}
                  <div className="flex items-center flex-wrap gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{report.attendedCount} Attended</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{report.missedCount} Missed</span>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-[#F4FAF8] border border-white/80 flex items-center justify-center text-[#6F849A]">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Client List Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-[#F9FBFA] p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#6F849A]">
                        Client Attendance & Dynamic Reminder Status ({report.clients.length} Clients)
                      </h5>
                    </div>

                    {report.clients.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        No clients assigned to this session.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[#6F849A] font-bold">
                              <th className="py-2.5 px-3">Client</th>
                              <th className="py-2.5 px-3">Attendance Status</th>
                              <th className="py-2.5 px-3">Next Scheduled Session</th>
                              <th className="py-2.5 px-3">Reminder Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60">
                            {report.clients.map((client) => {
                              const actionKey = `remind_${report.sessionId}_${client.clientId}`;
                              const toggleKey = `toggle_${report.sessionId}_${client.clientId}`;
                              const isSending = actionInProgress === actionKey;
                              const isToggling = actionInProgress === toggleKey;

                              return (
                                <tr key={client.clientId} className="hover:bg-white/80 transition-colors">
                                  {/* Client Name & Email */}
                                  <td className="py-3 px-3">
                                    <div className="font-extrabold text-[#10203B]">
                                      {client.clientName}
                                    </div>
                                    <div className="text-[11px] text-[#6F849A]">
                                      {client.clientEmail}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-3">
                                    {client.status === "attended" ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Attended
                                      </span>
                                    ) : client.status === "missed" ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                        <XCircle className="w-3 h-3 text-rose-600" />
                                        Missed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        Upcoming
                                      </span>
                                    )}
                                  </td>

                                  {/* Next Session */}
                                  <td className="py-3 px-3">
                                    {client.nextSession ? (
                                      client.nextSession.isSameMonth ? (
                                        <span className="inline-flex flex-col gap-0.5">
                                          <span className="text-[11px] font-extrabold text-emerald-700 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-emerald-600" />
                                            This Month: {client.nextSession.formattedDate}
                                          </span>
                                          <span className="text-[10px] text-[#6F849A]">
                                            at {client.nextSession.formattedTime} ({client.nextSession.title})
                                          </span>
                                        </span>
                                      ) : client.nextSession.isNextMonth ? (
                                        <span className="inline-flex flex-col gap-0.5">
                                          <span className="text-[11px] font-extrabold text-indigo-700 flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-indigo-600" />
                                            Next Month: {client.nextSession.formattedDate}
                                          </span>
                                          <span className="text-[10px] text-[#6F849A]">
                                            at {client.nextSession.formattedTime} ({client.nextSession.title})
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-semibold text-[#10203B]">
                                          {client.nextSession.formattedDate} at {client.nextSession.formattedTime}
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[11px] text-[#6F849A] italic">
                                        No upcoming session
                                      </span>
                                    )}
                                  </td>

                                  {/* Reminder Status */}
                                  <td className="py-3 px-3">
                                    {client.reminderStatus === "sent_same_month" ? (
                                      <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        title={`In-app notification and email dispatched to ${client.clientEmail || "client"}`}
                                      >
                                        <Mail className="w-2.5 h-2.5 text-emerald-600" />
                                        Sent & Emailed (This Month)
                                      </span>
                                    ) : client.reminderStatus === "sent_next_month" ? (
                                      <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200"
                                        title={`In-app notification and email dispatched to ${client.clientEmail || "client"}`}
                                      >
                                        <Mail className="w-2.5 h-2.5 text-indigo-600" />
                                        Sent & Emailed (Next Month)
                                      </span>
                                    ) : client.reminderStatus === "sent" ? (
                                      <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200"
                                        title={`In-app notification and email dispatched to ${client.clientEmail || "client"}`}
                                      >
                                        <Mail className="w-2.5 h-2.5 text-amber-600" />
                                        Sent & Emailed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                        Not Sent
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {client.status === "missed" && (
                                        <button
                                          onClick={() =>
                                            handleSendManualReminder(
                                              report.sessionId,
                                              client,
                                              report.title,
                                              report.scheduledAt
                                            )
                                          }
                                          disabled={isSending}
                                          title={`Send in-app reminder and email to ${client.clientEmail || "client"}`}
                                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-900 border border-amber-300/80 hover:bg-amber-500/25 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
                                        >
                                          <Mail className={`w-3 h-3 ${isSending ? "animate-pulse" : ""}`} />
                                          <span>{isSending ? "Sending Email..." : "Send Reminder & Email"}</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() =>
                                          handleToggleAttendance(
                                            report.sessionId,
                                            client.clientId,
                                            client.status
                                          )
                                        }
                                        disabled={isToggling}
                                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[#10203B] font-bold text-[11px] shadow-sm transition-all"
                                      >
                                        {client.status === "attended"
                                          ? "Mark Missed"
                                          : "Mark Attended"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
