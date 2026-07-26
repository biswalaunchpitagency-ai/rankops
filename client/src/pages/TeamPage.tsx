import { useState } from "react";
import { useSearchParams } from "react-router";
import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "../lib/auth-client";
import { Role } from "core/constants/role.ts";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ErrorAlert from "@/components/ErrorAlert";
import UserForm from "./UserForm";
import UsersTable from "./UsersTable";

interface EditingUser {
  id: string;
  name: string;
  email: string;
}

interface DeletingUser {
  id: string;
  name: string;
}

type DialogState = { mode: "create" } | { mode: "edit"; user: EditingUser } | null;

export default function TeamPage() {
  const { activeWorkspaceId } = useActiveWorkspace();
  const { data: session } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const isAdmin = session?.user?.role === Role.admin;
  const currentTab = searchParams.get("tab") === "users" && isAdmin ? "users" : "members";

  const [dialog, setDialog] = useState<DialogState>(null);
  const [deletingUser, setDeletingUser] = useState<DeletingUser | null>(null);

  const closeDialog = () => setDialog(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeletingUser(null);
    },
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["workspace-members", activeWorkspaceId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/members`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="font-display text-4xl font-light tracking-tight text-foreground leading-none">Team & Users</h1>
          <p className="text-[13px] text-muted-foreground mt-2">
            {currentTab === "users"
              ? "Global application user accounts directory"
              : "Specialists and assignees in this workspace"}
          </p>
        </div>

        {currentTab === "users" && (
          <Button
            onClick={() => setDialog({ mode: "create" })}
            className="gap-2 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 cursor-pointer shadow-none h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New User</span>
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-4 border-b border-border">
          <button
            onClick={() => setSearchParams({ tab: "members" })}
            className={`pb-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors duration-200 cursor-pointer ${
              currentTab === "members"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Workspace Team
          </button>
          <button
            onClick={() => setSearchParams({ tab: "users" })}
            className={`pb-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors duration-200 cursor-pointer ${
              currentTab === "users"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Global User Directory
          </button>
        </div>
      )}

      {currentTab === "users" ? (
        <div className="space-y-4 animate-in-page">
          <UsersTable
            onEdit={(user) => setDialog({ mode: "edit", user })}
            onDelete={(user) => setDeletingUser(user)}
          />

          <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
            <DialogContent className="rounded-md border border-border shadow-[0_4px_16px_rgba(0,0,0,0.08)] bg-popover font-sans max-w-md">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
                  {dialog?.mode === "edit" ? "Edit User" : "Create User"}
                </DialogTitle>
              </DialogHeader>
              <UserForm
                key={dialog?.mode === "edit" ? dialog.user.id : "create"}
                user={dialog?.mode === "edit" ? dialog.user : undefined}
                onSuccess={closeDialog}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog open={deletingUser !== null} onOpenChange={(open) => { if (!open) { setDeletingUser(null); deleteMutation.reset(); } }}>
            <AlertDialogContent className="rounded-md border border-border shadow-[0_4px_16px_rgba(0,0,0,0.08)] bg-popover font-sans max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
                  Delete User
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground mt-2">
                  Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteMutation.isError && (
                <ErrorAlert message="Failed to delete user" />
              )}
              <AlertDialogFooter className="pt-2">
                <AlertDialogCancel className="rounded-sm border border-border bg-muted hover:bg-muted/80 text-foreground text-xs transition-all cursor-pointer shadow-none px-3.5 py-1.5 h-8">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
                  className="rounded-sm bg-[#9f2f2d] hover:bg-[#b03a37] text-white text-xs font-medium transition-all cursor-pointer shadow-none px-3.5 py-1.5 h-8"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in-page">
          {members.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 py-16 text-center text-muted-foreground text-xs">
              No team members assigned to this workspace.
            </div>
          ) : (
            members.map((m) => {
              const initials = m.user.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <div key={m.id} className="border border-border rounded-md bg-card p-6 flex flex-col justify-between hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-primary/20 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-mono font-medium text-xs shrink-0">
                      {initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground leading-snug">{m.user.name}</h4>
                      <p className="text-[10px] font-mono tracking-wide text-muted-foreground uppercase mt-0.5">{m.role}</p>
                    </div>
                  </div>
                  <div className="border-t border-border mt-4 pt-4 text-[11px] text-muted-foreground font-mono space-y-1">
                    <p className="truncate"><span className="text-[9px] text-muted-foreground/75 uppercase tracking-wide mr-1">EMAIL:</span> {m.user.email}</p>
                    <p><span className="text-[9px] text-muted-foreground/75 uppercase tracking-wide mr-1">SYSTEM ROLE:</span> <span className="capitalize">{m.user.role}</span></p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
