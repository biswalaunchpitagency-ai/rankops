import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { Role } from "core/constants/role.ts";
import { signOut, useSession } from "../lib/auth-client";
import { useTheme } from "../lib/theme";
import { Sun, Moon, LogOut, Layers, Ticket, LayoutDashboard, Users, Plus, Check, ChevronsUpDown } from "lucide-react";
import Sidebar from "./Sidebar";
import { WorkspaceProvider, useActiveWorkspace } from "../lib/workspace-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function LayoutContent() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-sm transition-all duration-200 whitespace-nowrap ${isActive
      ? "text-foreground bg-secondary"
      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 h-14 flex items-center justify-between gap-2 min-w-0">

        {/* Left side: brand + nav links */}
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none">
          <Link to="/" className="flex items-center gap-2 mr-4 shrink-0 group">
            <div className="h-6 w-6 rounded-sm bg-primary flex items-center justify-center transition-transform active:scale-95 shrink-0">
              <span className="text-primary-foreground font-semibold text-xs tracking-wider">L</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-foreground hidden sm:block">Launchpit Agency</span>
          </Link>

          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline">Dashboard</span>
          </NavLink>
          <NavLink to="/tickets" className={navLinkClass}>
            <Ticket className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline">Tickets</span>
          </NavLink>
          <NavLink to="/workspaces" className={navLinkClass}>
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline">Workspaces</span>
          </NavLink>
          {session?.user?.role === Role.admin && (
            <NavLink to="/users" className={navLinkClass}>
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:inline">Users</span>
            </NavLink>
          )}
        </div>

        {/* Right side: workspace switcher + theme + sign out */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Workspace Switcher — uses DropdownMenu so actions don't pollute active workspace state */}
          {session && workspaces.length > 0 && (
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-7 inline-flex items-center gap-1.5 text-[12px] bg-muted/60 hover:bg-muted border border-border text-foreground font-medium px-2 py-0.5 rounded-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[160px]">
                    {activeWorkspace?.logoUrl ? (
                      <img src={activeWorkspace.logoUrl} className="h-3.5 w-3.5 rounded-xs object-cover shrink-0" alt="" />
                    ) : (
                      <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate max-w-[90px]">{activeWorkspace?.name ?? "Workspace"}</span>
                    <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px] font-sans">
                  <DropdownMenuLabel className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    Workspaces
                  </DropdownMenuLabel>
                  {workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      className="text-[12px] py-1.5 cursor-pointer gap-2"
                      onSelect={() => setActiveWorkspaceId(ws.id)}
                    >
                      {ws.logoUrl ? (
                        <img src={ws.logoUrl} className="h-3.5 w-3.5 rounded-xs object-cover shrink-0" alt="" />
                      ) : (
                        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="flex-1 truncate">{ws.name}</span>
                      {ws.id === activeWorkspaceId && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[12px] py-1.5 cursor-pointer gap-2 text-primary font-medium"
                    onSelect={() => navigate("/workspaces?create=true")}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Create Workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-[12px] py-1.5 cursor-pointer gap-2"
                    onSelect={() => navigate("/workspaces")}
                  >
                    <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    View All Workspaces
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Quick-create button */}
              <Link
                to="/workspaces?create=true"
                className="h-7 w-7 inline-flex items-center justify-center rounded-sm bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                title="Create Workspace"
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-sm h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shrink-0"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block shrink-0" />

          <span className="text-[12px] font-mono text-muted-foreground hidden lg:block truncate max-w-[100px]">
            {session?.user?.name}
          </span>

          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-sm text-[13px] font-medium px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shrink-0"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </nav>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full animate-in-page bg-background text-foreground">
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
