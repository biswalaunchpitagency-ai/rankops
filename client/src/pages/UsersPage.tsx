import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
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

export default function UsersPage() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deletingUser, setDeletingUser] = useState<DeletingUser | null>(null);
  const queryClient = useQueryClient();

  const close = () => setDialog(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeletingUser(null);
    },
  });

  return (
    <div className="space-y-6 font-sans animate-in-page">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">Users</h1>
        <Button
          onClick={() => setDialog({ mode: "create" })}
          className="gap-2 rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          <span>New User</span>
        </Button>
      </div>
      <UsersTable
        onEdit={(user) => setDialog({ mode: "edit", user })}
        onDelete={(user) => setDeletingUser(user)}
      />
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              {dialog?.mode === "edit" ? "Edit User" : "Create User"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            key={dialog?.mode === "edit" ? dialog.user.id : "create"}
            user={dialog?.mode === "edit" ? dialog.user : undefined}
            onSuccess={close}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog open={deletingUser !== null} onOpenChange={(open) => { if (!open) { setDeletingUser(null); deleteMutation.reset(); } }}>
        <AlertDialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && (
            <ErrorAlert message="Failed to delete user" />
          )}
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              className="rounded-sm bg-[#9f2f2d] hover:bg-[#b03a37] text-white text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
