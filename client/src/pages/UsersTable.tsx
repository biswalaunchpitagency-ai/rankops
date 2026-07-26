import { useQuery } from "@tanstack/react-query";
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
import { Pencil, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

interface UsersTableProps {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export default function UsersTable({ onEdit, onDelete }: UsersTableProps) {
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
                  <TableCell className="text-[13px] text-muted-foreground font-mono py-3">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3 text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
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
