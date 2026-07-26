import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useSession } from "../lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBoardSchema, type CreateBoardInput, inviteMemberSchema, type InviteMemberInput } from "core/schemas/tasks.ts";
import { Button } from "@/components/ui/button";
import ClientsTab from "../components/ClientsTab";
import SopsTab from "../components/SopsTab";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";
import BackLink from "@/components/BackLink";
import { PlusCircle, Kanban, ArrowRight, UserPlus, Star, Settings, Trash2, Lock, Globe, UserX, Layers } from "lucide-react";
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
  pinnedBy?: { id: string }[];
  _count: { tasks: number; columns: number };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isPrivate?: boolean;
  ownerId: string;
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
  const [activeTab, setActiveTab] = useState<"boards" | "clients" | "sops" | "members">("boards");

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
    resolver: zodResolver(inviteMemberSchema) as any,
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

  const { data: session } = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);

  useEffect(() => {
    if (workspace) {
      setEditName(workspace.name);
      setEditDescription(workspace.description || "");
      setEditLogoUrl(workspace.logoUrl || "");
      setEditIsPrivate(workspace.isPrivate || false);
    }
  }, [workspace]);

  const pinBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      await axios.post(`/api/workspaces/${workspaceId}/boards/${boardId}/pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
    },
  });

  const unpinBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      await axios.delete(`/api/workspaces/${workspaceId}/boards/${boardId}/pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (input: any) => {
      await axios.put(`/api/workspaces/${workspaceId}`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setShowSettings(false);
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/workspaces/${workspaceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      navigate("/workspaces");
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await axios.put(`/api/workspaces/${workspaceId}/members/${userId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
  });

  const isLoading = wsLoading || boardsLoading;

  return (
    <div className="space-y-6 font-sans animate-in-page">
      <BackLink to="/workspaces">All Workspaces</BackLink>

      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded-sm" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded-sm" />)}
          </div>
        </div>
      )}

      {workspace && !isLoading && (() => {
        const userMember = workspace.members.find((m) => m.user.id === session?.user?.id);
        const isOwner = userMember?.role === "owner" || workspace.ownerId === session?.user?.id;
        const isAdmin = userMember?.role === "admin" || isOwner;
        const isViewer = userMember?.role === "viewer";

        const pinnedBoards = boards.filter((b) => b.pinnedBy && b.pinnedBy.length > 0);

        return (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-sm bg-secondary flex items-center justify-center border border-border overflow-hidden shrink-0">
                  {workspace.logoUrl ? (
                    <img src={workspace.logoUrl} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">{workspace.name}</h1>
                    <span
                      title={workspace.isPrivate ? "Private Workspace" : "Public Workspace"}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground border border-border mt-1"
                    >
                      {workspace.isPrivate ? (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Private</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3" />
                          <span>Public</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[12px] font-mono text-muted-foreground mt-0.5">{workspace.slug}</p>
                  {workspace.description && (
                    <p className="text-[13px] text-muted-foreground mt-2 max-w-2xl">{workspace.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                    onClick={() => setShowInvite(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite Member</span>
                  </Button>
                )}
                {!isViewer && (
                  <Button
                    className="gap-2 rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                    onClick={() => setShowCreateBoard(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>New Board</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-border mb-6">
              {(["boards", "clients", "sops", "members"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? "border-primary text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "sops"
                    ? "SOPs & Library"
                    : tab === "clients"
                    ? "Clients & Reports"
                    : tab === "members"
                    ? "Members"
                    : "Boards & Tasks"}
                </button>
              ))}
            </div>

            {activeTab === "boards" && (
              <>
                {/* Pinned Boards section */}
                {pinnedBoards.length > 0 && (
                  <div className="space-y-3 pb-6 border-b border-border pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span>Pinned Boards</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pinnedBoards.map((board) => (
                        <Link
                          key={board.id}
                          to={`/boards/${board.id}`}
                          className="block no-underline text-card-foreground hover:no-underline"
                        >
                          <Card
                            className="cursor-pointer border border-border rounded-sm hover:border-primary/40 hover:bg-secondary/20 transition-all duration-200 group shadow-none bg-card relative"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div className="h-8 w-8 rounded-sm bg-secondary flex items-center justify-center mb-3 border border-border">
                                  <Kanban className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    title="Unpin board"
                                    className="p-1 text-yellow-400 hover:text-muted-foreground transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      unpinBoardMutation.mutate(board.id);
                                    }}
                                  >
                                    <Star className="h-4 w-4 fill-current" />
                                  </button>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <CardTitle className="text-base font-semibold tracking-tight text-foreground">{board.name}</CardTitle>
                              <CardDescription className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                {board._count.tasks} tasks · {board._count.columns} columns
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boards grid */}
                {boards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-sm bg-secondary/15">
                    <Kanban className="h-10 w-10 text-muted-foreground mb-4" />
                    <h2 className="font-display text-2xl font-normal tracking-tight text-foreground mb-1">No boards yet</h2>
                    <p className="text-muted-foreground text-xs mb-6 max-w-sm">
                      Create your first board to organize tasks in Kanban columns.
                    </p>
                    {!isViewer && (
                      <Button
                        onClick={() => setShowCreateBoard(true)}
                        className="gap-2 rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Create Board</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      All Boards ({boards.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {boards.map((board) => {
                        const isPinned = board.pinnedBy && board.pinnedBy.length > 0;
                        return (
                          <Link
                            key={board.id}
                            to={`/boards/${board.id}`}
                            className="block no-underline text-card-foreground hover:no-underline"
                          >
                            <Card
                              className="cursor-pointer border border-border rounded-sm hover:border-primary/40 hover:bg-secondary/20 transition-all duration-200 group shadow-none bg-card"
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                  <div className="h-8 w-8 rounded-sm bg-secondary flex items-center justify-center mb-3 border border-border">
                                    <Kanban className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      title={isPinned ? "Unpin board" : "Pin board"}
                                      className={`p-1 transition-colors cursor-pointer ${
                                        isPinned
                                          ? "text-yellow-400 hover:text-muted-foreground"
                                          : "text-muted-foreground/40 hover:text-yellow-400"
                                      }`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (isPinned) {
                                          unpinBoardMutation.mutate(board.id);
                                        } else {
                                          pinBoardMutation.mutate(board.id);
                                        }
                                      }}
                                    >
                                      <Star className={`h-4 w-4 ${isPinned ? "fill-current" : ""}`} />
                                    </button>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                <CardTitle className="text-base font-semibold tracking-tight text-foreground">{board.name}</CardTitle>
                                <CardDescription className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  {board._count.tasks} tasks · {board._count.columns} columns
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "clients" && (
              <ClientsTab workspaceId={workspace.id} />
            )}

            {activeTab === "sops" && (
              <SopsTab workspaceId={workspace.id} />
            )}

            {activeTab === "members" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-normal text-foreground">Workspace Members</h3>
                  {isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => setShowInvite(true)}
                      className="gap-1.5 rounded-sm"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Invite Member
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((m) => {
                    const isTargetOwner = m.role === "owner";
                    const isTargetAdmin = m.role === "admin";
                    const isSelf = m.user.id === session?.user?.id;

                    const canEditRole = !isSelf && (
                      isOwner || 
                      (isAdmin && !isTargetOwner && !isTargetAdmin)
                    );

                    const canRemove = !isTargetOwner && (
                      isSelf || 
                      isOwner || 
                      (isAdmin && !isTargetAdmin)
                    );

                    return (
                      <div key={m.id} className="border border-border rounded-md p-4 bg-background flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[14px] font-semibold text-foreground">{m.user.name} {isSelf && "(You)"}</p>
                          <p className="text-[12px] text-muted-foreground">{m.user.email}</p>
                        </div>
                        <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                          {canEditRole ? (
                            <select
                              value={m.role}
                              onChange={(e) => updateMemberRoleMutation.mutate({ userId: m.user.id, role: e.target.value })}
                              className="bg-background text-[12px] font-medium border border-border rounded-sm px-2 py-1 text-muted-foreground cursor-pointer focus-visible:outline-none"
                            >
                              <option value="owner">Transfer Owner</option>
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border/60">
                              {m.role}
                            </span>
                          )}

                          {canRemove && (
                            <Button
                              variant="outline"
                              size="sm"
                              title={isSelf ? "Leave Workspace" : "Remove Member"}
                              className="h-7 text-[11px] text-muted-foreground hover:text-destructive border-border"
                              onClick={() => {
                                const msg = isSelf 
                                  ? "Are you sure you want to leave this workspace?" 
                                  : `Are you sure you want to remove ${m.user.name} from the workspace?`;
                                if (confirm(msg)) {
                                  removeMemberMutation.mutate(m.user.id);
                                }
                              }}
                            >
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              {isSelf ? "Leave" : "Remove"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Create board dialog */}
      <Dialog open={showCreateBoard} onOpenChange={setShowCreateBoard}>
        <DialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              Create Board
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={boardForm.handleSubmit((d) => createBoardMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="board-name" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Board Name</Label>
              <Input
                id="board-name"
                placeholder="e.g., Sprint 1, Bug Fixes, Roadmap"
                className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
                {...boardForm.register("name")}
              />
              {boardForm.formState.errors.name && (
                <ErrorMessage message={boardForm.formState.errors.name.message} />
              )}
            </div>
            {createBoardMutation.error && (
              <ErrorAlert error={createBoardMutation.error} fallback="Failed to create board" />
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                onClick={() => setShowCreateBoard(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBoardMutation.isPending}
                className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
              >
                {createBoardMutation.isPending ? "Creating..." : "Create Board"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite member dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              Invite Member
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={inviteForm.handleSubmit((d) => inviteMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
                {...inviteForm.register("email")}
              />
              {inviteForm.formState.errors.email && (
                <ErrorMessage message={inviteForm.formState.errors.email.message} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Role</Label>
              <select
                id="invite-role"
                className="w-full rounded-sm border border-border bg-background focus:ring-primary text-[13px] h-9 px-2"
                {...inviteForm.register("role")}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {inviteMutation.error && (
              <ErrorAlert error={inviteMutation.error} fallback="Failed to invite member" />
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
              >
                {inviteMutation.isPending ? "Inviting..." : "Invite Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              Workspace Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Workspace Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full min-h-[60px] rounded-sm border border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary p-2 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-logo" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Logo URL</Label>
              <Input
                id="edit-logo"
                value={editLogoUrl}
                onChange={(e) => setEditLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-private"
                checked={editIsPrivate}
                onChange={(e) => setEditIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded-xs border-border bg-background text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="edit-private" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                Private Workspace (Only members can view)
              </Label>
            </div>

            {updateWorkspaceMutation.error && (
              <ErrorAlert error={updateWorkspaceMutation.error} fallback="Failed to update settings" />
            )}

            <div className="flex gap-2 justify-between pt-4 border-t border-border mt-6">
              {workspace && workspace.ownerId === session?.user?.id ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-sm text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                  onClick={() => {
                    if (confirm("Are you absolutely sure you want to delete this workspace? All boards and tickets will be permanently deleted!")) {
                      deleteWorkspaceMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Workspace
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={updateWorkspaceMutation.isPending}
                  className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                  onClick={() => updateWorkspaceMutation.mutate({
                    name: editName,
                    description: editDescription,
                    logoUrl: editLogoUrl,
                    isPrivate: editIsPrivate
                  })}
                >
                  {updateWorkspaceMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
