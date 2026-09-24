import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface AdminNotification {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_completed?: boolean;
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const markAllAsSeen = useCallback(async (currentNotifs?: AdminNotification[]) => {
    const list = currentNotifs || notifications;
    const unread = list.filter((n) => !n.is_completed);
    if (unread.length === 0) return;

    const unreadIds = unread.map((n) => n.id);

    // Optimistically update local state so badges and counters clear immediately
    setNotifications((prev) =>
      prev.map((n) =>
        unreadIds.includes(n.id) ? { ...n, is_completed: true } : n
      )
    );

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_completed: true })
        .in("id", unreadIds);

      if (error) {
        console.error("Error marking notifications as seen:", error);
      }
    } catch (err) {
      console.error("Failed to update notifications as seen:", err);
    }
  }, [notifications]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      markAllAsSeen();
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as AdminNotification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id ? (payload.new as AdminNotification) : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_completed).length;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative w-10 h-10 rounded-2xl bg-white shadow-[3px_3px_8px_rgba(160,185,180,0.3),-2px_-2px_6px_rgba(255,255,255,0.95)] border border-white/90 hover:bg-white text-[#334D66] hover:text-[#08A982] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-b from-[#0CC194] to-[#079975] text-white text-[10px] font-extrabold flex items-center justify-center shadow-[0_2px_6px_rgba(8,169,130,0.4)] border border-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 bg-white border border-white/90 rounded-[22px] shadow-[8px_8px_24px_rgba(130,155,151,0.2),-4px_-4px_16px_rgba(255,255,255,0.95)] overflow-hidden"
      >
        <div className="p-4 border-b border-black/5 bg-[#EEF7F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-sm text-[#10203B]">Notifications</h4>
            {unreadCount > 0 && (
              <span className="bg-[#08A982]/15 text-[#08A982] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[#6F849A] hover:text-[#10203B] p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1.5 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-[#6F849A]">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 rounded-xl bg-white/70 border border-white/80 shadow-[2px_2px_5px_rgba(180,200,196,0.15),-1px_-1px_3px_rgba(255,255,255,0.9)] hover:bg-white transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-[#10203B]">{n.title}</p>
                </div>
                <p className="text-[11px] text-[#6F849A] mt-0.5 leading-relaxed">
                  {n.description}
                </p>
                <p className="text-[9.5px] text-[#94A3B8] font-medium mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
