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
  User,
  Users
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
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

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center h-20 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <img 
            src={logo} 
            alt="Sculpt and Strive" 
            className={cn(
              "object-contain transition-all duration-300",
              collapsed ? "w-12 h-12" : "w-14 h-14"
            )}
          />
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-display text-lg font-bold text-sidebar-primary-foreground leading-tight">
                Sculpt And Strive
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Admin Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <ul className="space-y-1.5">
          {menuItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group",
                  collapsed && "justify-center px-2"
                )}
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-md"
              >
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                )} />
                {!collapsed && (
                  <span className="truncate animate-fade-in">{item.title}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50",
          collapsed && "justify-center px-2"
        )}>
          <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{displayEmail}</p>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={handleSignOut}
              className="p-1.5 rounded hover:bg-sidebar-accent transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-sidebar-foreground/60" />
            </button>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-24 w-6 h-6 bg-accent text-accent-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
