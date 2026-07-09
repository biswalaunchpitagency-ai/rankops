import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBoardSchema, type CreateBoardInput, inviteMemberSchema, type InviteMemberInput } from "core/schemas/tasks.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";
import BackLink from "@/components/BackLink";
import { PlusCircle, Kanban, ArrowRight, UserPlus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Board {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: string;
  _count: { tasks: number; columns: number };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[];
  teams: { id: string; name: string }[];
  boards: Board[];
}

interface WorkspaceMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; role: string };
}

export default function WorkspaceDetailPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { data: workspace, isLoading: wsLoading } = useQuery<Workspace>({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const { data } = await axios.get<Workspace>(`/api/workspaces/${workspaceId}`);
      return data;
    },
    enabled: !!workspaceId,
  });

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["boards", workspaceId],
    queryFn: async () => {
      const { data } = await axios.get<Board[]>(`/api/boards?workspaceId=${workspaceId}`);
      return data;
    },
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      const { data } = await axios.get<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`);
      return data;
    },
    enabled: !!workspaceId,
  });

  const boardForm = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: "", workspaceId: workspaceId! },
  });

  const createBoardMutation = useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const { data } = await axios.post<Board>("/api/boards", input);
      return data;
    },
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      setShowCreateBoard(false);
      boardForm.reset();
      navigate(`/boards/${board.id}`);
    },
  });

  const inviteForm = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", workspaceId: workspaceId!, role: "member" },
  });

  const inviteMutation = useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      await axios.post("/api/workspaces/invite", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      setShowInvite(false);
      inviteForm.reset();
    },
  });

  const isLoading = wsLoading || boardsLoading;

  return (
    <div className="space-y-6">
      <BackLink to="/workspaces">All Workspaces</BackLink>

      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded" />)}
          </div>
        </div>
      )}

      {workspace && !isLoading && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{workspace.name}</h1>
              <p className="text-muted-foreground text-sm font-mono mt-0.5">{workspace.slug}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
              <Button className="gap-2" onClick={() => setShowCreateBoard(true)}>
                <PlusCircle className="h-4 w-4" />
                New Board
              </Button>
            </div>
          </div>

          {/* Members strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="h-4 w-4 text-muted-foreground" />
            {members.map((m) => (
              <Badge key={m.id} variant="secondary" className="gap-1.5 text-xs">
                {m.user.name}
                <span className="text-muted-foreground capitalize">{m.role}</span>
              </Badge>
            ))}
          </div>

          {/* Boards grid */}
          {boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Kanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h2 className="text-lg font-semibold mb-1">No boards yet</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Create your first board to organize tasks in Kanban columns.
              </p>
              <Button onClick={() => setShowCreateBoard(true)} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Create Board
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <Card
                  key={board.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                  onClick={() => navigate(`/boards/${board.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <Kanban className="h-5 w-5 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-base">{board.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {board._count.tasks} tasks · {board._count.columns} columns
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create board dialog */}
      <Dialog open={showCreateBoard} onOpenChange={setShowCreateBoard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Board</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={boardForm.handleSubmit((d) => createBoardMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="board-name">Board Name</Label>
              <Input
                id="board-name"
                placeholder="e.g., Sprint 1, Bug Fixes, Roadmap"
                {...boardForm.register("name")}
              />
              {boardForm.formState.errors.name && (
                <ErrorMessage message={boardForm.formState.errors.name.message} />
              )}
            </div>
            {createBoardMutation.error && (
              <ErrorAlert error={createBoardMutation.error} fallback="Failed to create board" />
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createBoardMutation.isPending}>
                {createBoardMutation.isPending ? "Creating..." : "Create Board"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateBoard(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite member dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={inviteForm.handleSubmit((d) => inviteMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                {...inviteForm.register("email")}
              />
              {inviteForm.formState.errors.email && (
                <ErrorMessage message={inviteForm.formState.errors.email.message} />
              )}
            </div>
            {inviteMutation.error && (
              <ErrorAlert error={inviteMutation.error} fallback="Failed to invite member" />
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Inviting..." : "Invite Member"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
