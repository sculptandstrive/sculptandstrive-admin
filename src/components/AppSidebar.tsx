import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Admin";
  const displayEmail = user?.email || "admin@sculptandstrive.com";
  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-3 top-3 bottom-3 bg-[#EEF6F5] rounded-[28px] border border-white/85 shadow-[8px_8px_24px_rgba(160,185,180,0.3),-4px_-4px_16px_rgba(255,255,255,0.95)] flex flex-col z-50 overflow-visible"
    >
      {/* Header: Logo + Title + Collapse Button */}
      <div
        className={cn(
          "p-3.5 pb-2.5 flex items-center transition-all relative",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 min-w-0",
            collapsed && "justify-center"
          )}
        >
          <div className="w-11 h-11 rounded-[16px] bg-white p-1.5 flex items-center justify-center shrink-0 shadow-[3px_3px_8px_rgba(150,175,170,0.22),-3px_-3px_8px_rgba(255,255,255,0.95)] border border-white/90">
            <img
              src={logo}
              alt="Sculpt and Strive"
              className="w-full h-full object-contain"
            />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden min-w-0"
              >
                <h1 className="font-extrabold text-[15px] leading-tight text-[#08A982] whitespace-nowrap truncate tracking-tight">
                  Sculpt And Strive
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E1F3ED] text-[#08A982] text-[10.5px] font-extrabold shadow-[inset_1px_1px_2px_rgba(8,169,130,0.15)]">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Circular Toggle Button */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 cursor-pointer",
            collapsed
              ? "absolute right-0 translate-x-1/2 top-[22px] bg-white hover:bg-[#F2F8F6] text-[#08A982] shadow-[3px_3px_8px_rgba(150,175,170,0.25),-2px_-2px_6px_rgba(255,255,255,0.95)] border border-white/90 z-50"
              : "bg-white hover:bg-[#F2F8F6] text-[#6F849A] hover:text-[#08A982] shadow-[3px_3px_7px_rgba(150,175,170,0.2),-3px_-3px_7px_rgba(255,255,255,0.95)] border border-white/80 ml-1"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-[#08A982]" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto no-scrollbar">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive =
              item.url === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.url);

            return (
              <li key={item.title} className="relative">
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveBar"
                    className="absolute -left-3 top-2.5 bottom-2.5 w-1.5 bg-[#08A982] rounded-r-full z-10 shadow-[0_0_6px_rgba(8,169,130,0.4)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <NavLink
                  to={item.url}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3.5 h-[46px] rounded-[20px] transition-all duration-200 group relative border",
                    isActive
                      ? "bg-white text-[#08A982] border-[#08A982]/30 shadow-[4px_4px_12px_rgba(8,169,130,0.18),-3px_-3px_10px_rgba(255,255,255,0.98),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                      : "bg-white hover:bg-[#F9FCFB] text-[#2D3E50] hover:text-[#08A982] border-white/90 shadow-[3.5px_3.5px_10px_rgba(150,175,170,0.18),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:shadow-[4.5px_4.5px_12px_rgba(150,175,170,0.25),-3px_-3px_10px_rgba(255,255,255,1)]",
                    collapsed ? "justify-center px-0" : ""
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors",
                      isActive
                        ? "bg-[#E6F7F2] text-[#08A982] shadow-[inset_1px_1px_2px_rgba(8,169,130,0.15),1px_1px_3px_rgba(255,255,255,0.8)]"
                        : "bg-[#F2F8F6] text-[#64748B] group-hover:text-[#08A982] group-hover:bg-[#EAF7F3] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.15),1px_1px_2px_rgba(255,255,255,0.9)]"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                  </div>

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className={cn(
                          "text-[13.5px] whitespace-nowrap overflow-hidden truncate tracking-tight",
                          isActive
                            ? "font-extrabold text-[#08A982]"
                            : "font-bold text-[#334D66] group-hover:text-[#10203B]"
                        )}
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section: Admin User Profile Card */}
      <div className="p-3 pt-1">
        <div
          className={cn(
            "p-2.5 rounded-[20px] bg-white border border-white/90 shadow-[4px_4px_12px_rgba(160,185,180,0.25),-3px_-3px_10px_rgba(255,255,255,0.95)] flex items-center gap-2.5 transition-all",
            collapsed ? "justify-center p-2" : ""
          )}
        >
          <Avatar className="w-9 h-9 rounded-xl border border-white/90 shadow-[2px_2px_5px_rgba(160,185,180,0.3),-2px_-2px_5px_rgba(255,255,255,0.9)] shrink-0">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-[#E1F3ED] text-[#08A982] font-extrabold text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-xs font-bold text-[#10203B] truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[10px] font-medium text-[#6F849A] truncate mt-0.5">
                  {displayEmail}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6F849A] hover:text-rose-600 bg-[#F2F8F6] hover:bg-rose-50 shadow-[1.5px_1.5px_3px_rgba(165,185,180,0.2),-1.5px_-1.5px_3px_rgba(255,255,255,0.85)] border border-white/80 transition-all shrink-0 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
