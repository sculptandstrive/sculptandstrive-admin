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
    const text = encodeURIComponent(
      ` *Admin Live Support*\n\n` +
      `*From:* ${ticket.user_name}\n` +
      `*Message:* ${ticket.message}\n` +
      `*Status:* ${ticket.status.toUpperCase()}`
    );
    window.open(`https://wa.me/${adminPhone}?text=${text}`, "_blank");
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (!error) fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-[#EF4444] text-white border-none">Open</Badge>;
      case "in_progress": return <Badge className="bg-[#F59E0B] text-white border-none">Viewing</Badge>;
      case "resolved": return <Badge className="bg-[#10B981] text-white border-none">Closed</Badge>;
      default: return <Badge variant="secondary" className="bg-[#E2E8F0] text-[#64748B] border-none">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="w-4 h-4 text-[#EF4444]" />;
      case "medium": return <Clock className="w-4 h-4 text-[#F59E0B]" />;
      case "low": return <CheckCircle className="w-4 h-4 text-[#10B981]" />;
      default: return <MessageCircle className="w-4 h-4 text-[#07AC7D]" />;
    }
  };

  return (
    <>
      <PageHeader
        title="Admin Support Dashboard"
        description="Monitor and respond to live user support tickets."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <Card className="border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] border-l-4 border-l-[#EF4444] bg-white">
          <CardContent className="pt-5 flex justify-between items-center">
            <div>
              <p className="text-xs text-[#64748B] font-semibold">NEW TICKETS</p>
              <p className="text-2xl font-bold text-[#111827]">{tickets.filter(t => t.status === 'open').length}</p>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[#EF4444]/10 text-[#EF4444]"><AlertCircle className="w-4 h-4" /></div>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] border-l-4 border-l-[#F59E0B] bg-white">
          <CardContent className="pt-5 flex justify-between items-center">
            <div>
              <p className="text-xs text-[#64748B] font-semibold">BEING VIEWED</p>
              <p className="text-2xl font-bold text-[#111827]">{tickets.filter(t => t.status === 'in_progress').length}</p>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[#F59E0B]/10 text-[#F59E0B]"><Eye className="w-4 h-4" /></div>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] border-l-4 border-l-[#10B981] bg-white">
          <CardContent className="pt-5 flex justify-between items-center">
            <div>
              <p className="text-xs text-[#64748B] font-semibold">CLOSED / SOLVED</p>
              <p className="text-2xl font-bold text-[#111827]">{tickets.filter(t => t.status === 'resolved').length}</p>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[#10B981]/10 text-[#10B981]"><CheckCircle className="w-4 h-4" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Support Tickets Column */}
        <Card className="lg:col-span-3 border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] pb-4">
            <CardTitle className="text-[#111827] font-bold">Live Support Tickets</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="text-[#64748B] hover:bg-[#07AC7D]/10 rounded-[8px]">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="text-center py-10 text-[#64748B]">No active tickets.</div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 rounded-[14px] border border-[#E2E8F0] bg-[#F5F7F9] space-y-3 hover:shadow-[0_4px_18px_rgba(15,23,42,0.08)] transition-shadow duration-150">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {getPriorityIcon(ticket.priority || "high")}
                        <div>
                          <p className="font-bold text-[#111827]">{ticket.user_name}</p>
                          <p className="text-xs text-[#64748B]">{new Date(ticket.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">{getStatusBadge(ticket.status)}</div>
                    </div>
                    <div className="p-3 bg-white rounded-[8px] border border-[#E2E8F0] text-sm italic text-[#334155] break-words overflow-hidden">
                      "{ticket.message}"
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#334155] hover:bg-[#07AC7D]/10 hover:text-[#07AC7D] rounded-[8px]" onClick={() => updateStatus(ticket.id, "in_progress")}>View</Button>
                        <Button variant="outline" size="sm" className="text-[#07AC7D] border-[#07AC7D]/30 hover:bg-[#07AC7D]/10 rounded-[8px]" onClick={() => updateStatus(ticket.id, "resolved")}>Close</Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="text-[#EF4444] hover:bg-[#EF4444]/10 rounded-[8px]" onClick={() => deleteTicket(ticket.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" className="bg-[#07AC7D] hover:bg-[#07AC7D]/90 text-white rounded-[8px] transition-colors duration-150" onClick={() => openWhatsApp(ticket)}>
                          <MessageSquare className="w-4 h-4 mr-2" /> Admin WP
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