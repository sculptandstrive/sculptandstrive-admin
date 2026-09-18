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
  is_completed?: boolean;
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, description, created_at, is_completed, recipient_type")
        .eq("recipient_type", "admin")
        .or("is_completed.eq.false,is_completed.is.null")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data as AdminNotification[]);
      }
    } catch (err) {
      console.warn("fetchNotifications error:", err);
    }
  };

  const markVisibleAsRead = async (items: AdminNotification[]) => {
    const unreadIds = items.filter((n) => !n.is_completed).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_completed: true })
        .in("id", unreadIds);
    } catch (err) {
      console.warn("Failed to mark notifications as read in backend:", err);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Mark all unread notifications as read in the backend upon viewing
      markVisibleAsRead(notifications);
      // Update local state to reflect they are read so badge disappears
      setNotifications((prev) => prev.map((n) => ({ ...n, is_completed: true })));
    } else {
      // Refresh list on close so only active/pending notifications remain
      fetchNotifications();
    }
  };

  const dismissNotification = async (id: string) => {
    // Optimistically remove from UI immediately
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_completed: true })
        .eq("id", id);

      if (error) {
        console.warn("Failed to dismiss notification:", error);
        fetchNotifications(); // revert on failure
      }
    } catch (e) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications([]);

    try {
      await supabase
        .from("notifications")
        .update({ is_completed: true })
        .in("id", unreadIds);
    } catch (e) {
      console.warn("Failed to mark all as read:", e);
      fetchNotifications();
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("admin-notifications-realtime-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as any;
            if (newNotif?.recipient_type === "admin" && !newNotif.is_completed) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === newNotif.id)) return prev;
                return [newNotif as AdminNotification, ...prev];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            if (updated?.recipient_type === "admin") {
              setNotifications((prev) =>
                prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
              );
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any;
            if (deleted?.id) {
              setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
            }
          }
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
        <Button
          variant="outline"
          size="icon"
          className="relative border-border bg-card hover:bg-muted text-foreground h-9 w-9 rounded-lg"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-border font-semibold text-sm text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Notifications</span>
            {unreadCount > 0 ? (
              <span className="text-[11px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                {unreadCount} new
              </span>
            ) : notifications.length > 0 ? (
              <span className="text-[11px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {notifications.length} recent
              </span>
            ) : null}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground text-center">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-3.5 hover:bg-muted/50 transition-colors flex items-start justify-between gap-2 cursor-pointer"
                onClick={() => dismissNotification(n.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-normal">{n.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(n.id);
                  }}
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