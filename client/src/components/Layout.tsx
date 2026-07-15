import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { Role } from "core/constants/role.ts";
import { signOut, useSession } from "../lib/auth-client";
import { useTheme } from "../lib/theme";
import { Sun, Moon, LogOut, Layers, Ticket, LayoutDashboard, Users } from "lucide-react";
import Sidebar from "./Sidebar";
import { WorkspaceProvider, useActiveWorkspace } from "../lib/workspace-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

function LayoutContent() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();

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
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 mr-6 group">
            <div className="h-6 w-6 rounded-sm bg-primary flex items-center justify-center transition-transform active:scale-95">
              <span className="text-primary-foreground font-semibold text-xs tracking-wider">L</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-foreground">Launchpit Agency</span>
          </Link>

          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className={navLinkClass}>
            <Ticket className="h-3.5 w-3.5" />
            Tickets
          </NavLink>

          {/* Workspace Switcher */}
          {session && workspaces.length > 0 && (
            <Select value={activeWorkspaceId} onValueChange={setActiveWorkspaceId}>
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
              </SelectContent>
            </Select>
          )}

          {session?.user?.role === Role.admin && (
            <NavLink to="/users" className={navLinkClass}>
              <Users className="h-3.5 w-3.5" />
              Users
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="inline-flex items-center justify-center rounded-sm h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="h-4 w-px bg-border mx-2" />
          <span className="text-[12px] font-mono text-muted-foreground mr-2">{session?.user?.name}</span>
          <button className="inline-flex items-center justify-center gap-1.5 rounded-sm text-[13px] font-medium px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer" onClick={handleSignOut}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Layout containing Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-8 py-8 w-full animate-in-page bg-background text-foreground">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <WorkspaceProvider>
      <LayoutContent />
    </WorkspaceProvider>
  );
}
