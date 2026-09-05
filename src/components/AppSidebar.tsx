import { 
  LayoutDashboard, 
  Calendar, 
  Dumbbell, 
  Apple, 
  TrendingUp, 
  HelpCircle, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  UsersRound
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Sessions", url: "/sessions", icon: Calendar },
  { title: "Fitness", url: "/fitness", icon: Dumbbell },
  { title: "Nutrition", url: "/nutrition", icon: Apple },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Users", url: "/users", icon: Users },
  { title: "Groups", url: "/admin/groups", icon: UsersRound },
  { title: "Support/Help", url: "/support", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";
  const displayEmail = user?.email || "";
  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src={
              user?.user_metadata?.avatar_url
                ? user?.user_metadata?.avatar_url
                : logo
            }
            alt="Sculpt and Strive"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="font-display font-bold text-lg leading-tight text-primary whitespace-nowrap">
                Sculpt And Strive
              </h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Admin Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 no-scrollbar overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-all duration-200 group text-sm font-medium relative",
                  collapsed && "justify-center px-2",
                )}
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                  )}
                />
                {!collapsed && (
                  <span className="truncate animate-fade-in">{item.title}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center",
          )}
        >
          <Avatar className="w-10 h-10 border-2 border-primary/30 flex-shrink-0">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in overflow-hidden">
              <p className="font-medium text-sm text-foreground whitespace-nowrap truncate">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground whitespace-nowrap truncate">
                {displayEmail || "Administrator"}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-md text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-all z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}
