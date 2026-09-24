import { useState, useEffect } from "react";
import {
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Mail,
  Check,
  RotateCcw,
  CheckCheck,
  Send,
  Sparkles,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type FilterTab = "active" | "all" | "open" | "viewing" | "closed";

const ADMIN_DELIMITER = "\n\n--- Admin Response ---\n";

export interface ParsedTicket {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_message: string;
  admin_response: string;
  status: "open" | "viewing" | "closed";
  created_at: string;
  priority?: string;
  raw: any;
}

export function parseTicket(rawTicket: any): ParsedTicket {
  let userMessage = rawTicket.message || "";
  let adminResponse = rawTicket.admin_response || "";

  if (!adminResponse && userMessage.includes(ADMIN_DELIMITER)) {
    const parts = userMessage.split(ADMIN_DELIMITER);
    userMessage = parts[0].trim();
    adminResponse = parts.slice(1).join(ADMIN_DELIMITER).trim();
  }

  let status: "open" | "viewing" | "closed" = "open";
  const rawStatus = (rawTicket.status || "").toLowerCase().trim();
  if (rawStatus === "viewing" || rawStatus === "in_progress") {
    status = "viewing";
  } else if (rawStatus === "closed" || rawStatus === "resolved") {
    status = "closed";
  } else {
    status = "open";
  }

  return {
    id: rawTicket.id,
    user_id: rawTicket.user_id,
    user_name: rawTicket.user_name || "Member User",
    user_email: rawTicket.user_email || "",
    user_message: userMessage,
    admin_response: adminResponse,
    status,
    created_at: rawTicket.created_at || new Date().toISOString(),
    priority: rawTicket.priority,
    raw: rawTicket,
  };
}

export default function Support() {
  const [tickets, setTickets] = useState<ParsedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<ParsedTicket | null>(null);
  const [adminResponseText, setAdminResponseText] = useState("");
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("active");
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ticketData, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error fetching tickets",
          description: error.message,
          variant: "destructive",
        });
      } else if (ticketData) {
        const parsed = ticketData.map(parseTicket);
        setTickets(parsed);
        if (selectedTicket) {
          const fresh = parsed.find((t) => t.id === selectedTicket.id);
          if (fresh) {
            setSelectedTicket(fresh);
            setAdminResponseText(fresh.admin_response);
          }
        }
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      toast({
        title: "Sync Error",
        description: err.message || "Failed to load tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin-tickets-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (
    id: string,
    newStatus: "open" | "viewing" | "closed",
    showToast = true
  ) => {
    try {
      const current = tickets.find((t) => t.id === id) || selectedTicket;
      if (!current) return;

      const { error } = await supabase
        .from("tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast({
          title: "Failed to update status",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Send status update notification to the user if user_id exists
      if (current.user_id && newStatus !== "open") {
        const todayStr = new Date().toISOString().split("T")[0];
        const statusLabel =
          newStatus === "closed" ? "Resolved & Closed" : "Under Review";
        try {
          await supabase.from("notifications").insert([
            {
              user_id: current.user_id,
              title: `Support Ticket ${statusLabel}`,
              description: `Your ticket regarding "${current.user_message.slice(0, 50)}" is now marked as ${statusLabel.toLowerCase()}.`,
              notification_date: todayStr,
              related_id: current.id,
              is_completed: false,
            },
          ]);
        } catch (notifErr) {
          console.warn("Status notification error:", notifErr);
        }
      }

      if (showToast) {
        const label =
          newStatus === "closed"
            ? "Closed"
            : newStatus === "viewing"
            ? "Viewing"
            : "Open";
        toast({
          title: "Status Updated",
          description: `Ticket marked as ${label}.`,
        });
      }

      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket((prev) =>
          prev ? { ...prev, status: newStatus } : null
        );
      }

      fetchData();
    } catch (err: any) {
      toast({
        title: "Update Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !adminResponseText.trim()) return;
    setIsSendingResponse(true);

    try {
      const responseTrimmed = adminResponseText.trim();
      const targetStatus =
        selectedTicket.status === "open" ? "viewing" : selectedTicket.status;

      const combinedMessage = `${selectedTicket.user_message}${ADMIN_DELIMITER}${responseTrimmed}`;

      // 1. Try updating admin_response column & combined message fallback
      let updatePayload: any = {
        admin_response: responseTrimmed,
        message: combinedMessage,
        status: targetStatus,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", selectedTicket.id);

      // Fallback if admin_response column doesn't exist in DB schema
      if (
        error &&
        (error.code === "PGRST204" || error.message?.includes("admin_response"))
      ) {
        const fallbackRes = await supabase
          .from("tickets")
          .update({
            message: combinedMessage,
            status: targetStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedTicket.id);
        error = fallbackRes.error;
      }

      if (error) {
        toast({
          title: "Failed to save response",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // 2. Insert notification for the user into the notifications table
      if (selectedTicket.user_id) {
        const todayStr = new Date().toISOString().split("T")[0];
        try {
          await supabase.from("notifications").insert([
            {
              user_id: selectedTicket.user_id,
              title: "Support Ticket Response Received",
              description: `Admin responded: "${responseTrimmed.slice(0, 100)}${
                responseTrimmed.length > 100 ? "..." : ""
              }"`,
              notification_date: todayStr,
              related_id: selectedTicket.id,
              is_completed: false,
            },
          ]);
        } catch (notifErr) {
          console.warn("Notification insert error:", notifErr);
        }
      }

      toast({
        title: "Response Saved & Sent",
        description:
          "Your response has been synchronized with the user and sent to their notifications.",
      });

      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              admin_response: responseTrimmed,
              status: targetStatus,
            }
          : null
      );

      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send response",
        variant: "destructive",
      });
    } finally {
      setIsSendingResponse(false);
    }
  };

  const handleViewTicket = (ticket: ParsedTicket) => {
    setSelectedTicket(ticket);
    setAdminResponseText(ticket.admin_response || "");
    setIsViewOpen(true);
    if (ticket.status === "open") {
      updateStatus(ticket.id, "viewing", false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-xs font-semibold px-2.5 py-0.5"
          >
            ● Open
          </Badge>
        );
      case "viewing":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold flex items-center gap-1 px-2.5 py-0.5"
          >
            <Eye className="w-3 h-3" /> Viewing
          </Badge>
        );
      case "closed":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold flex items-center gap-1 px-2.5 py-0.5"
          >
            <CheckCheck className="w-3 h-3" /> Closed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {status}
          </Badge>
        );
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />;
      case "medium":
        return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
      case "low":
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <MessageCircle className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  // Filter & Search logic
  const openCount = tickets.filter((t) => t.status === "open").length;
  const viewingCount = tickets.filter((t) => t.status === "viewing").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;
  const activeCount = openCount + viewingCount;

  const filteredTickets = tickets.filter((ticket) => {
    // Status filter
    if (activeFilter === "active" && ticket.status === "closed") return false;
    if (activeFilter === "open" && ticket.status !== "open") return false;
    if (activeFilter === "viewing" && ticket.status !== "viewing") return false;
    if (activeFilter === "closed" && ticket.status !== "closed") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (ticket.user_name || "").toLowerCase();
      const email = (ticket.user_email || "").toLowerCase();
      const msg = (ticket.user_message || "").toLowerCase();
      const id = (ticket.id || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        msg.includes(q) ||
        id.includes(q)
      );
    }

    return true;
  });

  return (
    <>
      <PageHeader
        title="Admin Support Dashboard"
        description="Monitor and respond to live member support tickets."
      >
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto">
          <div className="relative order-2 w-full sm:order-1 sm:w-[220px] lg:w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              aria-label="Search support tickets"
              className="h-10 w-full rounded-xl border-0 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] pl-10 text-sm font-medium text-[#0F172A] placeholder:text-[#7186A0]/70"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="order-3 h-10 w-full gap-2 rounded-xl border border-white bg-[#F0F7F5] shadow-[2px_2px_5px_rgba(180,200,196,0.2),-2px_-2px_5px_rgba(255,255,255,0.9)] px-4 text-xs font-bold text-[#0F172A] hover:bg-[#E6F2EE] sm:order-2 sm:w-auto transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Data</span>
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Open Tickets",
            value: openCount,
            icon: AlertCircle,
            filter: "open" as FilterTab,
            iconClass:
              "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]",
          },
          {
            label: "In Review (Viewing)",
            value: viewingCount,
            icon: Eye,
            filter: "viewing" as FilterTab,
            iconClass:
              "bg-[#FFF7ED] border-[#FFEDD5] text-[#EA580C]",
          },
          {
            label: "Closed Tickets",
            value: closedCount,
            icon: CheckCircle,
            filter: "closed" as FilterTab,
            iconClass:
              "bg-[#E6F7F3] border-[#BEE7DC] text-[#07AC7D]",
          },
          {
            label: "Total Tickets",
            value: tickets.length,
            icon: MessageCircle,
            filter: "all" as FilterTab,
            iconClass:
              "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]",
          },
        ].map(({ label, value, icon: Icon, iconClass, filter }) => (
          <Card
            key={label}
            onClick={() => setActiveFilter(filter)}
            className={`cursor-pointer rounded-2xl border border-white/90 bg-white transition-all duration-200 ${
              activeFilter === filter
                ? "shadow-[5px_5px_14px_rgba(8,181,148,0.25),-3px_-3px_10px_rgba(255,255,255,0.98)] ring-2 ring-[#08B594] -translate-y-0.5"
                : "shadow-[3px_3px_8px_rgba(180,200,196,0.2),-2px_-2px_6px_rgba(255,255,255,0.95)] hover:shadow-[5px_5px_14px_rgba(160,185,180,0.28),-3px_-3px_10px_rgba(255,255,255,0.98)] hover:-translate-y-0.5"
            }`}
          >
            <CardContent className="flex items-center justify-between p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-[#7186A0] truncate">
                  {label}
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight leading-none mt-1.5">
                  {value}
                </p>
              </div>
              <div
                className={`ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(0,0,0,0.06)] ${iconClass}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Support Tickets Table/Card */}
      <div className="mt-6">
        <Card className="bg-white border border-white/90 shadow-[6px_6px_18px_rgba(145,170,165,0.22),-4px_-4px_14px_rgba(255,255,255,0.95)] rounded-[28px] overflow-hidden">
          <CardHeader className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[18px] font-semibold text-foreground">
                Support Inquiries
              </CardTitle>
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              >
                {filteredTickets.length}
              </Badge>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center bg-[#E1EDE9] shadow-[inset_2px_2px_4px_rgba(165,188,183,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] p-1 rounded-2xl gap-1">
              <button
                onClick={() => setActiveFilter("active")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeFilter === "active"
                    ? "bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] text-white shadow-[0_2px_6px_rgba(8,169,130,0.35)]"
                    : "text-[#7186A0] hover:text-[#08B594]"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setActiveFilter("open")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeFilter === "open"
                    ? "bg-red-600 text-white shadow-[0_2px_6px_rgba(220,38,38,0.35)]"
                    : "text-[#7186A0] hover:text-red-500"
                }`}
              >
                Open ({openCount})
              </button>
              <button
                onClick={() => setActiveFilter("viewing")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeFilter === "viewing"
                    ? "bg-amber-500 text-white shadow-[0_2px_6px_rgba(245,158,11,0.35)]"
                    : "text-[#7186A0] hover:text-amber-600"
                }`}
              >
                Viewing ({viewingCount})
              </button>
              <button
                onClick={() => setActiveFilter("closed")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeFilter === "closed"
                    ? "bg-emerald-600 text-white shadow-[0_2px_6px_rgba(5,150,105,0.35)]"
                    : "text-[#7186A0] hover:text-emerald-600"
                }`}
              >
                Closed ({closedCount})
              </button>
              <button
                onClick={() => setActiveFilter("all")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeFilter === "all"
                    ? "bg-slate-800 text-white shadow-[0_2px_6px_rgba(30,41,59,0.35)]"
                    : "text-[#7186A0] hover:text-slate-900"
                }`}
              >
                All ({tickets.length})
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {filteredTickets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center text-sm font-normal text-muted-foreground">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  No {activeFilter !== "all" ? activeFilter : ""} tickets found.
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isClosed = ticket.status === "closed";
                  return (
                    <div
                      key={ticket.id}
                      className={`space-y-3.5 rounded-2xl border transition-all duration-200 p-4 sm:p-5 ${
                        isClosed
                          ? "border-white/70 bg-white/80 shadow-[2px_2px_5px_rgba(180,200,196,0.15),-2px_-2px_5px_rgba(255,255,255,0.95)] opacity-80"
                          : "border-white/90 bg-white shadow-[3px_3px_8px_rgba(180,200,196,0.18),-2px_-2px_6px_rgba(255,255,255,0.95)] hover:shadow-[4px_4px_12px_rgba(180,200,196,0.25),-3px_-3px_10px_rgba(255,255,255,0.98)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2.5">
                          {getPriorityIcon(ticket.priority || "high")}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={`truncate text-sm font-semibold ${
                                  isClosed
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {ticket.user_name ||
                                  ticket.user_email ||
                                  ticket.user_id ||
                                  "Member User"}
                              </p>
                              {isClosed && (
                                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40">
                                  Closed
                                </span>
                              )}
                            </div>
                            {ticket.user_email && (
                              <p className="truncate text-xs text-muted-foreground">
                                {ticket.user_email}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {ticket.created_at
                                ? new Date(ticket.created_at).toLocaleString()
                                : "Just now"}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">{getStatusBadge(ticket.status)}</div>
                      </div>

                      {/* User Message */}
                      <div className="overflow-hidden break-words rounded-xl border border-white/60 bg-[#E2ECE9] shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.8)] p-3.5 text-sm font-medium leading-relaxed text-[#0F172A]">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          User Message
                        </span>
                        "{ticket.user_message}"
                      </div>

                      {/* Admin Response Snippet if available */}
                      {ticket.admin_response && (
                        <div className="overflow-hidden break-words rounded-xl border border-[#08B594]/30 bg-[#E6F4F0] shadow-[inset_1.5px_1.5px_3px_rgba(8,169,130,0.15),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.8)] p-3.5 text-sm font-medium leading-relaxed text-[#065F46]">
                          <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#07AC7D]">
                            <Sparkles className="h-3.5 w-3.5" /> Admin Response
                          </span>
                          "{ticket.admin_response}"
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {/* View & Respond Button */}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 flex-1 rounded-xl border border-white bg-[#F0F7F5] shadow-[2px_2px_5px_rgba(180,200,196,0.2),-2px_-2px_5px_rgba(255,255,255,0.9)] hover:bg-[#E6F2EE] px-4 text-xs font-bold text-[#08B594] transition-all sm:flex-none"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                          <span>View & Respond</span>
                        </Button>

                        {/* Close / Reopen Toggle Button */}
                        {isClosed ? (
                          <Button
                            type="button"
                            className="h-9 flex-1 rounded-[10px] bg-slate-800 px-4 text-xs font-medium text-white hover:bg-slate-700 transition-colors sm:flex-none"
                            onClick={() => updateStatus(ticket.id, "open")}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            <span>Reopen</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            className="h-9 flex-1 rounded-xl bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] shadow-[0_2px_6px_rgba(8,169,130,0.3)] hover:brightness-105 active:scale-95 px-4 text-xs font-bold text-white transition-all sm:flex-none"
                            onClick={() => updateStatus(ticket.id, "closed")}
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Close</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Details View & Response Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col w-[calc(100%-1.5rem)] max-w-lg rounded-[26px] bg-white border border-white p-6 sm:p-7 shadow-[8px_8px_30px_rgba(145,170,165,0.25)] overflow-hidden">
          <DialogHeader className="border-b border-[#E2ECE9] pb-3.5 shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-lg font-bold text-[#0F172A] tracking-tight">
                Support Ticket Details
              </DialogTitle>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </div>
            <DialogDescription className="text-xs font-medium text-[#7186A0]">
              Submitted on{" "}
              {selectedTicket?.created_at
                ? new Date(selectedTicket.created_at).toLocaleString()
                : "Recently"}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
              {/* Sender Details */}
              <div className="rounded-2xl bg-[#E2ECE9] p-3.5 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.8)] border border-white/60">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0F172A]">
                    {selectedTicket.user_name || "Member User"}
                  </span>
                  {selectedTicket.user_email && (
                    <a
                      href={`mailto:${selectedTicket.user_email}`}
                      className="flex items-center gap-1 text-xs font-bold text-[#08B594] hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" /> {selectedTicket.user_email}
                    </a>
                  )}
                </div>
              </div>

              {/* USER MESSAGE */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7186A0]">
                  Ticket Message
                </p>
                <div className="rounded-2xl bg-white border border-white/90 p-4 text-xs sm:text-sm font-medium leading-relaxed text-[#0F172A] shadow-[2px_2px_8px_rgba(145,170,165,0.15)] whitespace-pre-wrap">
                  {selectedTicket.user_message}
                </div>
              </div>

              {/* ADMIN RESPONSE SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7186A0]">
                    Admin Response
                  </p>
                  {selectedTicket.admin_response && (
                    <span className="bg-[#E6F7F3] text-[#08B594] border border-[#BDEADE] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Answered
                    </span>
                  )}
                </div>

                {selectedTicket.admin_response ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs sm:text-sm leading-relaxed text-[#0F172A] whitespace-pre-wrap shadow-[inset_1px_1px_2px_rgba(165,185,180,0.2)]">
                    <p className="mb-1 text-xs font-bold text-[#08B594]">
                      Current Response:
                    </p>
                    {selectedTicket.admin_response}
                  </div>
                ) : (
                  <p className="px-1 text-xs font-medium italic text-[#7186A0]">
                    No response added yet.
                  </p>
                )}

                {/* Write or Edit Response */}
                <div className="space-y-2.5 pt-1">
                  <textarea
                    rows={3}
                    placeholder="Write your response to the member..."
                    value={adminResponseText}
                    onChange={(e) => setAdminResponseText(e.target.value)}
                    className="w-full resize-y rounded-2xl border border-white bg-[#E2ECE9] p-3 text-xs sm:text-sm font-semibold text-[#0F172A] placeholder:text-[#7186A0] shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[#08B594]/40 transition-all"
                  />
                  <Button
                    onClick={handleSendResponse}
                    disabled={
                      isSendingResponse ||
                      !adminResponseText.trim() ||
                      adminResponseText.trim() === selectedTicket.admin_response
                    }
                    className="h-10 w-full gap-2 rounded-xl bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] text-xs sm:text-sm font-bold text-white shadow-[0_3px_8px_rgba(8,169,130,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSendingResponse ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>
                      {selectedTicket.admin_response
                        ? "Update Response"
                        : "Send Response"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* UPDATE STATUS */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#7186A0]">
                  Update Status
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`h-9 flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      selectedTicket.status === "open"
                        ? "bg-rose-500 text-white shadow-[0_3px_8px_rgba(239,68,68,0.35)] font-black"
                        : "bg-white hover:bg-rose-50 text-[#475569] hover:text-rose-600 border border-[#DCE8E5] shadow-[1px_1px_3px_rgba(165,185,180,0.15)]"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "open")}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className={`h-9 flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      selectedTicket.status === "viewing"
                        ? "bg-amber-500 text-white shadow-[0_3px_8px_rgba(245,158,11,0.35)] font-black"
                        : "bg-white hover:bg-amber-50 text-[#475569] hover:text-amber-600 border border-[#DCE8E5] shadow-[1px_1px_3px_rgba(165,185,180,0.15)]"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "viewing")}
                  >
                    Viewing
                  </button>
                  <button
                    type="button"
                    className={`h-9 flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      selectedTicket.status === "closed"
                        ? "bg-[#08B594] text-white shadow-[0_3px_8px_rgba(8,181,148,0.35)] font-black"
                        : "bg-white hover:bg-emerald-50 text-[#475569] hover:text-[#08B594] border border-[#DCE8E5] shadow-[1px_1px_3px_rgba(165,185,180,0.15)]"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "closed")}
                  >
                    Closed
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-1 flex flex-row items-center justify-end gap-2 border-t border-[#E2ECE9] pt-3.5 shrink-0">
            <Button
              variant="outline"
              className="h-9 px-6 rounded-xl border border-white/80 bg-white shadow-[2px_2px_6px_rgba(180,200,196,0.2),-2px_-2px_6px_rgba(255,255,255,0.9)] text-xs font-bold text-[#334155] hover:text-[#08B594] hover:bg-[#F8FAFC] transition-all"
              onClick={() => setIsViewOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}