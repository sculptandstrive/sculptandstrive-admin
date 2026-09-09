import { useState, useEffect } from "react";
import {
  MessageCircle, Clock,
  CheckCircle, AlertCircle, Trash2,
  RefreshCw, MessageSquare, Eye
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ticketData } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketData) setTickets(ticketData);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) fetchData();
  };

  const openWhatsApp = (ticket: any) => {
    const adminPhone = "8637261676";
    const sender = ticket.user_name || ticket.user_email || ticket.user_id || "Member";
    const text = encodeURIComponent(
      ` *Admin Live Support*\n\n` +
      `*From:* ${sender}\n` +
      `*Message:* ${ticket.message}\n` +
      `*Status:* ${(ticket.status || "open").toUpperCase()}`
    );
    window.open(`https://wa.me/${adminPhone}?text=${text}`, "_blank");
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (!error) fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-semibold">Open</Badge>;
      case "in_progress": return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-semibold">Viewing</Badge>;
      case "resolved": return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-semibold">Closed</Badge>;
      default: return <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-xs font-semibold">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />;
      case "medium": return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      case "low": return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
      default: return <MessageCircle className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  return (
    <>
      <PageHeader
        title="Admin Support Dashboard"
        description="Monitor and respond to live user support tickets."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-5 mb-6 sm:mb-8">
        <Card className="border border-border rounded-2xl shadow-sm border-l-4 border-l-destructive bg-card">
          <CardContent className="p-2.5 sm:p-5 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">NEW</p>
              <p className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight leading-none mt-1 sm:mt-1.5">{tickets.filter(t => t.status === 'open').length}</p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-destructive/10 text-destructive"><AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border border-border rounded-2xl shadow-sm border-l-4 border-l-amber-500 bg-card">
          <CardContent className="p-2.5 sm:p-5 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">VIEWING</p>
              <p className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight leading-none mt-1 sm:mt-1.5">{tickets.filter(t => t.status === 'in_progress').length}</p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500 dark:text-amber-400"><Eye className="w-3.5 h-3.5 sm:w-5 sm:h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border border-border rounded-2xl shadow-sm border-l-4 border-l-emerald-500 bg-card">
          <CardContent className="p-2.5 sm:p-5 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">SOLVED</p>
              <p className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight leading-none mt-1 sm:mt-1.5">{tickets.filter(t => t.status === 'resolved').length}</p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Support Tickets Column */}
        <Card className="lg:col-span-3 border border-border rounded-2xl shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-[20px] font-semibold text-foreground">Live Support Tickets</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="text-muted-foreground hover:bg-primary/10 rounded-xl h-8 px-2 sm:px-3 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {tickets.length === 0 ? (
                <div className="text-center py-10 text-sm font-normal text-muted-foreground">No active tickets.</div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-3 sm:p-4 rounded-2xl border border-border bg-muted/40 space-y-3 hover:shadow-md transition-shadow duration-150">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-2.5 items-start min-w-0">
                        {getPriorityIcon(ticket.priority || "high")}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                            {ticket.user_name || ticket.user_email || ticket.user_id || "Member User"}
                          </p>
                          {ticket.user_email && ticket.user_name && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{ticket.user_email}</p>
                          )}
                          <p className="text-[10px] sm:text-xs font-normal text-muted-foreground mt-0.5">
                            {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "Just now"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">{getStatusBadge(ticket.status)}</div>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-card rounded-xl border border-border text-xs sm:text-sm font-normal text-muted-foreground break-words overflow-hidden">
                      "{ticket.message}"
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-1">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs font-semibold border-border text-foreground hover:bg-muted rounded-xl h-8 px-3 flex-1 sm:flex-none" onClick={() => updateStatus(ticket.id, "in_progress")}>View</Button>
                        <Button variant="outline" size="sm" className="text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 rounded-xl h-8 px-3 flex-1 sm:flex-none" onClick={() => updateStatus(ticket.id, "resolved")}>Close</Button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl h-8 w-8" onClick={() => deleteTicket(ticket.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-8 px-3 transition-colors duration-150" onClick={() => openWhatsApp(ticket)}>
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Admin WP
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}