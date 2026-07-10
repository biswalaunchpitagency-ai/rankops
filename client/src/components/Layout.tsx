import { Link, NavLink, Outlet, useNavigate, useLocation, matchPath } from "react-router";
import { Role } from "core/constants/role.ts";
import { signOut, useSession } from "../lib/auth-client";
import { useTheme } from "../lib/theme";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  LayoutDashboard,
  Ticket,
  Users,
  LogOut,
  Sun,
  Moon,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "./ui/select";

export default function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: workspaces = [] } = useQuery<any[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data } = await axios.get<any[]>("/api/workspaces");
      return data;
    },
    enabled: !!session,
  });

  const wsMatch = matchPath({ path: "/workspaces/:id" }, location.pathname);
  const boardMatch = matchPath({ path: "/boards/:id" }, location.pathname);
  const boardId = boardMatch?.params.id;

  const { data: board } = useQuery<any>({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const { data } = await axios.get<any>(`/api/boards/${boardId}`);
      return data;
    },
    enabled: !!session && !!boardId,
  });

  const activeWorkspaceId = wsMatch?.params.id || board?.workspaceId || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 text-[13px] font-medium px-3 py-1.5 rounded-sm transition-all duration-200 ${
      isActive
        ? "text-foreground bg-secondary"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 mr-6 group"
          >
            <div className="h-6 w-6 rounded-sm bg-primary flex items-center justify-center transition-transform active:scale-95">
              <span className="text-primary-foreground font-semibold text-xs tracking-wider">
                L
              </span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-foreground transition-colors">
              Launchpit Agency
            </span>
          </Link>
          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className={navLinkClass}>
            <Ticket className="h-3.5 w-3.5" />
            Tickets
          </NavLink>
          
          <div className="flex items-center gap-1.5">
            <NavLink to="/workspaces" className={navLinkClass}>
              <Layers className="h-3.5 w-3.5" />
              Workspaces
            </NavLink>

            {session && workspaces.length > 0 && (
              <Select
                value={activeWorkspaceId || "none"}
                onValueChange={(val) => {
                  if (val === "new") {
                    navigate("/workspaces");
                  } else if (val !== "none") {
                    navigate(`/workspaces/${val}`);
                  }
                }}
              >
                <SelectTrigger className="h-7 text-[12px] bg-secondary/40 border-border text-foreground hover:bg-secondary/80 font-medium px-2 py-0.5 rounded-sm shadow-none focus-visible:ring-0">
                  <SelectValue placeholder="Switch Workspace" />
                </SelectTrigger>
                <SelectContent align="start" className="bg-popover border border-border rounded-sm shadow-md min-w-[160px] font-sans">
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id} className="text-[12px] py-1 cursor-pointer">
                      <span className="flex items-center gap-1.5">
                        {ws.logoUrl ? (
                          <img src={ws.logoUrl} className="h-3.5 w-3.5 rounded-xs object-cover" alt="" />
                        ) : (
                          <Layers className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{ws.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="new" className="text-[12px] text-muted-foreground py-1 cursor-pointer">
                    + New Workspace
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {session?.user?.role === Role.admin && (
            <NavLink to="/users" className={navLinkClass}>
              <Users className="h-3.5 w-3.5" />
              Users
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-sm h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <div className="h-4 w-px bg-border mx-2" />
          <span className="text-[12px] font-mono text-muted-foreground mr-2">
            {session?.user?.name}
          </span>
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-sm text-[13px] font-medium px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 cursor-pointer active:scale-98"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </nav>
      <main className="flex-1 px-8 py-8 max-w-[1200px] w-full mx-auto animate-in-page">
        <Outlet />
      </main>
    </div>
  );
}
