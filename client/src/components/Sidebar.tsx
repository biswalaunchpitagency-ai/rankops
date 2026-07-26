import { useState } from "react";
import { NavLink } from "react-router";
import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Inbox,
  Briefcase,
  Users,
  BookOpen,
  BarChart,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );
  const { activeWorkspace, activeWorkspaceId } = useActiveWorkspace();

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  const { data: inboxCount = 0 } = useQuery<number>({
    queryKey: ["unread-inbox-count", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return 0;
      const { data } = await axios.get<any>(`/api/workspaces/${activeWorkspaceId}/tickets?status=new`);
      return data.total || 0;
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 10000
  });

  const links = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Sprint Board", path: "/boards", icon: Kanban },
    { name: "All Tickets", path: "/tickets", icon: FileText },
    { name: "Support Inbox", path: "/inbox", icon: Inbox, badge: inboxCount },
    { name: "Clients", path: "/clients", icon: Briefcase },
    { name: "Team", path: "/team", icon: Users },
    { name: "SOPs & Library", path: "/library", icon: BookOpen },
    { name: "Reports", path: "/reports", icon: BarChart }
  ];

  return (
    <aside
      className={`bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border ${
        isCollapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground tracking-tight text-[13px]">
              {activeWorkspace?.name || "RankOps"}
            </span>
            <span className="text-[9px] text-muted-foreground font-mono tracking-wider">SEO OPERATIONS</span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1 rounded-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer ml-auto"
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-[13px] font-medium border-l-2 transition-all duration-200 ${
                isActive
                  ? "border-primary bg-sidebar-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`
            }
          >
            <link.icon size={15} className="shrink-0" />
            {!isCollapsed && (
              <span className="flex-1 flex justify-between items-center">
                <span>{link.name}</span>
                {!!link.badge && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-tight">
                    {link.badge}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
