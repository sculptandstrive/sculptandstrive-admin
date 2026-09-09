import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, description, created_at")
      .eq("recipient_type", "admin")
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) setNotifications(data || []);
  };

  const dismissNotification = async (id: string) => {
    // Optimistically remove from UI immediately
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    const { error } = await supabase
      .from("notifications")
      .update({ is_completed: true })
      .eq("id", id);

    if (error) {
      console.log("Failed to dismiss:", error);
      fetchNotifications(); // revert on failure
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: "recipient_type=eq.admin" },
        (payload) => {
          setNotifications((prev) => [payload.new as AdminNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative border-slate-200 h-9 w-9"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px] text-[#334155]" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#EF4444] rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-slate-100 font-semibold text-sm text-slate-800">
          Notifications
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-slate-400 text-center">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-slate-300 hover:text-slate-600 shrink-0 mt-0.5"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}