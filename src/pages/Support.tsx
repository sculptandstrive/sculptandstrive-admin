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

      const { error } = await supabase
        .from("tickets")
        .update({
          admin_response: responseTrimmed,
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);

      if (error) {
        toast({
          title: "Failed to save response",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Response Saved",
        description: "Your response is now synchronized with the user.",
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
              className="h-10 w-full rounded-[10px] border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground shadow-none focus-visible:border-[#07AC7D] focus-visible:ring-[#07AC7D]/15"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="order-3 h-10 w-full gap-2 rounded-[10px] border-border bg-card px-4 text-foreground shadow-none hover:border-[#07AC7D] hover:bg-muted sm:order-2 sm:w-auto"
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
              "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400",
          },
          {
            label: "In Review (Viewing)",
            value: viewingCount,
            icon: Eye,
            filter: "viewing" as FilterTab,
            iconClass:
              "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
          },
          {
            label: "Closed Tickets",
            value: closedCount,
            icon: CheckCircle,
            filter: "closed" as FilterTab,
            iconClass:
              "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Total Tickets",
            value: tickets.length,
            icon: MessageCircle,
            filter: "all" as FilterTab,
            iconClass:
              "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
          },
        ].map(({ label, value, icon: Icon, iconClass, filter }) => (
          <Card
            key={label}
            onClick={() => setActiveFilter(filter)}
            className={`cursor-pointer rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-[#07AC7D]/50 hover:shadow-md ${
              activeFilter === filter ? "ring-2 ring-[#07AC7D]" : ""
            }`}
          >
            <CardContent className="flex items-center justify-between p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                  {label}
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight leading-none mt-1.5">
                  {value}
                </p>
              </div>
              <div
                className={`ml-2 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Support Tickets Table/Card */}
      <div className="mt-6">
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
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
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveFilter("active")}
                className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeFilter === "active"
                    ? "bg-[#07AC7D] text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setActiveFilter("open")}
                className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeFilter === "open"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Open ({openCount})
              </button>
              <button
                onClick={() => setActiveFilter("viewing")}
                className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeFilter === "viewing"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Viewing ({viewingCount})
              </button>
              <button
                onClick={() => setActiveFilter("closed")}
                className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeFilter === "closed"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Closed ({closedCount})
              </button>
              <button
                onClick={() => setActiveFilter("all")}
                className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeFilter === "all"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                      className={`space-y-3.5 rounded-2xl border p-4 sm:p-5 transition-all duration-150 ${
                        isClosed
                          ? "border-emerald-500/20 bg-muted/20 opacity-80"
                          : "border-border bg-card hover:border-[#07AC7D]/40 hover:shadow-sm"
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
                      <div className="overflow-hidden break-words rounded-[10px] border border-border/80 bg-muted/30 p-3.5 text-sm font-normal leading-relaxed text-foreground">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          User Message
                        </span>
                        "{ticket.user_message}"
                      </div>

                      {/* Admin Response Snippet if available */}
                      {ticket.admin_response && (
                        <div className="overflow-hidden break-words rounded-[10px] border border-[#07AC7D]/25 bg-[#07AC7D]/5 p-3.5 text-sm leading-relaxed text-foreground">
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
                          className="h-9 flex-1 rounded-[10px] border-border bg-card px-4 text-xs font-medium text-foreground hover:border-[#07AC7D] hover:bg-muted hover:text-foreground transition-colors sm:flex-none"
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
                            className="h-9 flex-1 rounded-[10px] bg-emerald-600 px-4 text-xs font-medium text-white hover:bg-emerald-700 transition-colors sm:flex-none"
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
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[18px] font-semibold text-foreground">
                Support Ticket Details
              </DialogTitle>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Submitted on{" "}
              {selectedTicket?.created_at
                ? new Date(selectedTicket.created_at).toLocaleString()
                : "Recently"}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 py-2">
              {/* Sender Details */}
              <div className="space-y-1.5 rounded-[10px] border border-border bg-muted/30 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {selectedTicket.user_name || "Member User"}
                  </span>
                  {selectedTicket.user_email && (
                    <a
                      href={`mailto:${selectedTicket.user_email}`}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" /> {selectedTicket.user_email}
                    </a>
                  )}
                </div>
              </div>

              {/* USER MESSAGE */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ticket Message
                </p>
                <div className="rounded-[10px] border border-border bg-muted/20 p-3.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {selectedTicket.user_message}
                </div>
              </div>

              {/* ADMIN RESPONSE SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin Response
                  </p>
                  {selectedTicket.admin_response && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-medium text-emerald-600"
                    >
                      Answered
                    </Badge>
                  )}
                </div>

                {selectedTicket.admin_response ? (
                  <div className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    <p className="mb-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Current Response:
                    </p>
                    {selectedTicket.admin_response}
                  </div>
                ) : (
                  <p className="px-1 text-xs italic text-muted-foreground">
                    No response added yet.
                  </p>
                )}

                {/* Write or Edit Response */}
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={3}
                    placeholder="Write your response to the member..."
                    value={adminResponseText}
                    onChange={(e) => setAdminResponseText(e.target.value)}
                    className="w-full resize-y rounded-[10px] border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#07AC7D] focus:outline-none focus:ring-2 focus:ring-[#07AC7D]/15"
                  />
                  <Button
                    onClick={handleSendResponse}
                    disabled={
                      isSendingResponse ||
                      !adminResponseText.trim() ||
                      adminResponseText.trim() === selectedTicket.admin_response
                    }
                    className="h-10 w-full gap-2 rounded-[10px] bg-[#07AC7D] text-sm font-medium text-white shadow-none hover:bg-[#06966D]"
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Update Status
                </p>
                <div className="flex gap-2">
                  <Button
                    className={`h-9 flex-1 rounded-[10px] text-xs font-medium transition-all ${
                      selectedTicket.status === "open"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "open")}
                  >
                    Open
                  </Button>
                  <Button
                    className={`h-9 flex-1 rounded-[10px] text-xs font-medium transition-all ${
                      selectedTicket.status === "viewing"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "viewing")}
                  >
                    Viewing
                  </Button>
                  <Button
                    className={`h-9 flex-1 rounded-[10px] text-xs font-medium transition-all ${
                      selectedTicket.status === "closed"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "closed")}
                  >
                    Closed
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 flex flex-row items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              className="h-10 w-full sm:w-auto px-6 rounded-[10px] border-border text-xs font-medium text-foreground hover:bg-muted hover:text-foreground hover:border-[#07AC7D] transition-colors"
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