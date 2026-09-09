import { useState, useEffect } from "react";
import {
  MessageCircle, Clock,
  CheckCircle, AlertCircle, Trash2,
  RefreshCw, MessageSquare, Eye, Mail, Check, X,
  RotateCcw, CheckCheck, Send, Sparkles
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        // If current modal is open, keep selectedTicket fresh
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

  const updateStatus = async (id: string, newStatus: "open" | "viewing" | "closed", showToast = true) => {
    try {
      // Find ticket
      const current = tickets.find((t) => t.id === id) || selectedTicket;
      if (!current) return;

      let { error } = await supabase
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
        const label = newStatus === "closed" ? "Closed" : newStatus === "viewing" ? "Viewing" : "Open";
        toast({
          title: "Status Updated",
          description: `Ticket marked as ${label}.`,
        });
      }

      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
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
      const targetStatus = selectedTicket.status === "open" ? "viewing" : selectedTicket.status;

      let { error } = await supabase
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

  const openWhatsApp = (ticket: ParsedTicket) => {
    const adminPhone = "918637261676";
    const sender = ticket.user_name || ticket.user_email || "Member";
    const text = encodeURIComponent(
      `*Sculpt & Strive Support Desk*\n\n` +
      `*User:* ${sender}\n` +
      `*Email:* ${ticket.user_email || "N/A"}\n` +
      `*Message:* ${ticket.user_message}\n` +
      `*Ticket Status:* ${ticket.status.toUpperCase()}`
    );
    window.open(`https://wa.me/${adminPhone}?text=${text}`, "_blank");
    toast({
      title: "Opening WhatsApp",
      description: "Redirecting to Live WhatsApp Support...",
    });
  };

  const deleteTicket = async (id: string) => {
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) {
        toast({
          title: "Failed to delete ticket",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Ticket Deleted",
        description: "Support ticket was successfully removed.",
      });
      if (selectedTicket?.id === id) {
        setIsViewOpen(false);
        setSelectedTicket(null);
      }
      fetchData();
    } catch (err: any) {
      toast({
        title: "Delete Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25 text-xs font-semibold px-2.5 py-0.5 uppercase tracking-wide">● Open</Badge>;
      case "viewing":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold flex items-center gap-1 px-2.5 py-0.5 uppercase tracking-wide"><Eye className="w-3 h-3" /> Viewing</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold flex items-center gap-1 px-2.5 py-0.5 uppercase tracking-wide"><CheckCheck className="w-3 h-3" /> Closed</Badge>;
      default:
        return <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-xs font-semibold uppercase">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />;
      case "medium": return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
      case "low": return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      default: return <MessageCircle className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  // Filter logic
  const openCount = tickets.filter(t => t.status === "open").length;
  const viewingCount = tickets.filter(t => t.status === "viewing").length;
  const closedCount = tickets.filter(t => t.status === "closed").length;
  const activeCount = openCount + viewingCount;

  const filteredTickets = tickets.filter((ticket) => {
    if (activeFilter === "active") return ticket.status !== "closed";
    if (activeFilter === "open") return ticket.status === "open";
    if (activeFilter === "viewing") return ticket.status === "viewing";
    if (activeFilter === "closed") return ticket.status === "closed";
    return true; // "all"
  });

  return (
    <>
      <PageHeader
        title="Admin Support Dashboard"
        description="Monitor and respond to live user support tickets."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-5 mb-6 sm:mb-8">
        <Card
          onClick={() => setActiveFilter("open")}
          className={`border border-border rounded-2xl shadow-sm border-l-4 border-l-destructive bg-card cursor-pointer transition-all hover:scale-[1.01] ${activeFilter === "open" ? "ring-2 ring-destructive/40" : ""}`}
        >
          <CardContent className="p-2.5 sm:p-5 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">NEW / OPEN</p>
              <p className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight leading-none mt-1 sm:mt-1.5">
                {openCount}
              </p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-destructive/10 text-destructive">
              <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveFilter("viewing")}
          className={`border border-border rounded-2xl shadow-sm border-l-4 border-l-amber-500 bg-card cursor-pointer transition-all hover:scale-[1.01] ${activeFilter === "viewing" ? "ring-2 ring-amber-500/40" : ""}`}
        >
          <CardContent className="p-2.5 sm:p-5 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">VIEWING</p>
              <p className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight leading-none mt-1 sm:mt-1.5">
                {viewingCount}
              </p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500">
              <Eye className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveFilter("closed")}
          className={`border border-border rounded-2xl shadow-sm border-l-4 border-l-emerald-500 bg-card cursor-pointer transition-all hover:scale-[1.01] ${activeFilter === "closed" ? "ring-2 ring-emerald-500/40" : ""}`}
        >
          <CardContent className="p-2.5 sm:p-5 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">CLOSED</p>
              <p className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight leading-none mt-1 sm:mt-1.5">
                {closedCount}
              </p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <Card className="border border-border rounded-2xl shadow-sm bg-card">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-[20px] font-semibold text-foreground">
                Support Tickets
              </CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full font-semibold">
                {filteredTickets.length}
              </Badge>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "active"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setActiveFilter("open")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "open"
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                Open ({openCount})
              </button>
              <button
                onClick={() => setActiveFilter("viewing")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "viewing"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                Viewing ({viewingCount})
              </button>
              <button
                onClick={() => setActiveFilter("closed")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "closed"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                Closed ({closedCount})
              </button>
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "all"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                All ({tickets.length})
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="text-muted-foreground hover:bg-primary/10 rounded-xl h-8 px-2.5 text-xs ml-1"
                title="Refresh Tickets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-sm font-normal text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  No {activeFilter !== "all" ? activeFilter : ""} tickets found.
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isClosed = ticket.status === "closed";
                  return (
                    <div
                      key={ticket.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 space-y-3 ${
                        isClosed
                          ? "bg-muted/20 border-emerald-500/20 opacity-80"
                          : "bg-muted/40 border-border hover:shadow-md hover:border-primary/30"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex gap-2.5 items-start min-w-0">
                          {getPriorityIcon(ticket.priority || "high")}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-xs sm:text-sm font-bold truncate ${isClosed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                {ticket.user_name || ticket.user_email || ticket.user_id || "Member User"}
                              </p>
                              {isClosed && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                                  Closed
                                </span>
                              )}
                            </div>
                            {ticket.user_email && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{ticket.user_email}</p>
                            )}
                            <p className="text-[10px] sm:text-xs font-normal text-muted-foreground mt-0.5">
                              {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "Just now"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">{getStatusBadge(ticket.status)}</div>
                      </div>

                      {/* User Message */}
                      <div className="p-3 bg-card rounded-xl border border-border text-xs sm:text-sm font-normal text-foreground break-words overflow-hidden leading-relaxed">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">User Message:</span>
                        "{ticket.user_message}"
                      </div>

                      {/* Admin Response Snippet if available */}
                      {ticket.admin_response && (
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-foreground break-words overflow-hidden leading-relaxed">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1 mb-1">
                            <Sparkles className="w-3 h-3" /> Admin Response:
                          </span>
                          "{ticket.admin_response}"
                        </div>
                      )}

                      {/* Action Buttons with High Contrast */}
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-1">
                        <div className="flex gap-2">
                          {/* View Button */}
                          <Button
                            type="button"
                            size="sm"
                            className="text-xs font-semibold bg-white dark:bg-slate-900 !text-slate-900 dark:!text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm rounded-xl h-8 px-3.5 flex-1 sm:flex-none"
                            onClick={() => handleViewTicket(ticket)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-700 dark:text-slate-300" /> View & Respond
                          </Button>

                          {/* Close / Reopen Toggle Button */}
                          {isClosed ? (
                            <Button
                              type="button"
                              size="sm"
                              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 !text-white shadow-sm rounded-xl h-8 px-3.5 flex-1 sm:flex-none"
                              onClick={() => updateStatus(ticket.id, "open")}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reopen
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 !text-white shadow-sm rounded-xl h-8 px-3.5 flex-1 sm:flex-none"
                              onClick={() => updateStatus(ticket.id, "closed")}
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" /> Close
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 rounded-xl h-8 w-8"
                            onClick={() => deleteTicket(ticket.id)}
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="text-xs font-semibold bg-[#07AC7D] hover:bg-[#06966D] !text-white rounded-xl h-8 px-3.5 shadow-sm transition-colors duration-150"
                            onClick={() => openWhatsApp(ticket)}
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
                          </Button>
                        </div>
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
        <DialogContent className="sm:max-w-lg bg-card border border-border p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-foreground">
                Support Ticket Details
              </DialogTitle>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Submitted on {selectedTicket?.created_at ? new Date(selectedTicket.created_at).toLocaleString() : "Recently"}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 py-2">
              {/* Sender Details */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {selectedTicket.user_name || "Member User"}
                  </span>
                  {selectedTicket.user_email && (
                    <a
                      href={`mailto:${selectedTicket.user_email}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <Mail className="w-3.5 h-3.5" /> {selectedTicket.user_email}
                    </a>
                  )}
                </div>
              </div>

              {/* USER MESSAGE */}
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1.5">
                  TICKET MESSAGE
                </label>
                <div className="p-4 rounded-xl bg-muted/20 border border-border text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.user_message}
                </div>
              </div>

              {/* ADMIN RESPONSE SECTION */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
                  <span>ADMIN RESPONSE</span>
                  {selectedTicket.admin_response && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Answered
                    </Badge>
                  )}
                </label>

                {selectedTicket.admin_response ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Current Response:</p>
                    {selectedTicket.admin_response}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic px-1">No response added yet.</p>
                )}

                {/* Write or Edit Response */}
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={3}
                    placeholder="Write your response to the user..."
                    value={adminResponseText}
                    onChange={(e) => setAdminResponseText(e.target.value)}
                    className="w-full p-3 text-sm rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendResponse}
                    disabled={isSendingResponse || !adminResponseText.trim() || adminResponseText.trim() === selectedTicket.admin_response}
                    className="w-full gap-1.5 font-bold bg-primary text-primary-foreground h-9 rounded-xl"
                  >
                    {isSendingResponse ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {selectedTicket.admin_response ? "Update Response" : "Send Response"}
                  </Button>
                </div>
              </div>

              {/* UPDATE STATUS */}
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-2">
                  UPDATE STATUS
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className={`flex-1 text-xs font-bold h-9 rounded-xl transition-all ${
                      selectedTicket.status === "open"
                        ? "bg-destructive text-destructive-foreground shadow-sm ring-2 ring-destructive/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "open")}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    className={`flex-1 text-xs font-bold h-9 rounded-xl transition-all ${
                      selectedTicket.status === "viewing"
                        ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "viewing")}
                  >
                    Viewing
                  </Button>
                  <Button
                    size="sm"
                    className={`flex-1 text-xs font-bold h-9 rounded-xl transition-all ${
                      selectedTicket.status === "closed"
                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                    onClick={() => updateStatus(selectedTicket.id, "closed")}
                  >
                    Closed
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-3 border-t border-border mt-2">
            {selectedTicket && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 rounded-xl text-xs h-9 px-3"
                onClick={() => deleteTicket(selectedTicket.id)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {selectedTicket && (
                <Button
                  size="sm"
                  className="bg-[#07AC7D] hover:bg-[#06966D] !text-white rounded-xl text-xs font-bold h-9 px-4"
                  onClick={() => openWhatsApp(selectedTicket)}
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" /> WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-9 font-semibold px-4"
                onClick={() => setIsViewOpen(false)}
              >
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}