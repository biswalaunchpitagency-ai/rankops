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
      const { data } = await axios.get<any>(`/api/workspaces/${activeWorkspaceId}/tickets`);
      // Count email-source tickets that are not resolved/closed
      return data.tickets.filter((t: any) => t.source === "email" && t.status === "new").length;
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
    { name: "Reports & Billing", path: "/reports", icon: BarChart }
  ];

  return (
    <aside
      className={`bg-[#111a2e] text-slate-300 flex flex-col transition-all duration-300 border-r border-slate-800 ${
        isCollapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-white tracking-tight text-sm">
              {activeWorkspace?.name || "RankOps"}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">SEO OPERATIONS</span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1 rounded-sm hover:bg-slate-800 hover:text-white cursor-pointer ml-auto"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-[13px] font-medium border-l-2 transition-all ${
                isActive
                  ? "border-[#6d8dff] bg-[#1e2d4f] text-white"
                  : "border-transparent hover:bg-slate-850 hover:text-white"
              }`
            }
          >
            <link.icon size={16} className="shrink-0" />
            {!isCollapsed && (
              <span className="flex-1 flex justify-between items-center">
                <span>{link.name}</span>
                {!!link.badge && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
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
