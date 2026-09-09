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
          className="relative border-border bg-card hover:bg-muted text-foreground h-9 w-9 rounded-lg"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-border font-semibold text-sm text-foreground flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {notifications.length} new
            </span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground text-center">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-3.5 hover:bg-muted/50 transition-colors flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-normal">{n.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-muted-foreground/50 hover:text-foreground shrink-0 mt-0.5 p-0.5 rounded hover:bg-muted"
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