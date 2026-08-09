import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Role } from "core/constants/role.ts";
import ErrorAlert from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Mail, CheckCircle2, Clock, Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  onboardedAt: string | null;
  createdAt: string;
}

interface UsersTableProps {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export default function UsersTable({ onEdit, onDelete }: UsersTableProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await axios.get<{ users: User[] }>("/api/users");
      return data.users;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (userId: string) => {
      setResendingId(userId);
      setResendStatus(null);
      const { data } = await axios.post(`/api/users/${userId}/resend-invite`);
      return data;
    },
    onSuccess: (_, userId) => {
      setResendStatus({ id: userId, success: true, message: "Invite email sent!" });
      setTimeout(() => setResendStatus(null), 3000);
    },
    onError: (err: any, userId) => {
      setResendStatus({ id: userId, success: false, message: err.response?.data?.error || "Failed to resend" });
      setTimeout(() => setResendStatus(null), 4000);
    },
    onSettled: () => {
      setResendingId(null);
    },
  });

  if (error) {
    return <ErrorAlert message="Failed to fetch users" />;
  }

  return (
    <div className="rounded-sm border border-border bg-card overflow-hidden font-sans">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent bg-secondary/35">
            <TableHead className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground h-10 py-2.5">Name</TableHead>
            <TableHead className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground h-10 py-2.5">Email</TableHead>
            <TableHead className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground h-10 py-2.5">Role</TableHead>
            <TableHead className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground h-10 py-2.5">Status</TableHead>
            <TableHead className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground h-10 py-2.5">Created</TableHead>
            <TableHead className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground h-10 py-2.5 text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border">
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-24 rounded-sm" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-40 rounded-sm" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-14 rounded-sm" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-20 rounded-sm" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-24 rounded-sm" />
                  </TableCell>
                  <TableCell className="py-3 text-right pr-4">
                    <Skeleton className="h-8 w-8 rounded-sm ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            : users?.map((user) => (
                <TableRow key={user.id} className="border-b border-border hover:bg-secondary/15 transition-colors">
                  <TableCell className="text-[13px] text-foreground font-medium py-3">{user.name}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground font-mono py-3">{user.email}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                      user.role === Role.admin
                        ? "bg-[#edf3ec] text-[#346538] border-[#346538]/10"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    {user.onboardedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Onboarded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        Pending Invite
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground font-mono py-3">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3 text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      {resendStatus && resendStatus.id === user.id ? (
                        <span className={`text-[11px] font-mono mr-2 ${resendStatus.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {resendStatus.message}
                        </span>
                      ) : null}

                      {!user.onboardedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resendingId === user.id}
                          className="h-7 text-[11px] font-medium px-2 rounded-sm border-border hover:bg-secondary cursor-pointer gap-1.5"
                          onClick={() => resendMutation.mutate(user.id)}
                          title="Resend invitation email"
                        >
                          {resendingId === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          Resend Invite
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                        onClick={() => onEdit(user)}
                        aria-label={`Edit ${user.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.role !== Role.admin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => onDelete(user)}
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
