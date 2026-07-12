import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createWorkspaceSchema, type CreateWorkspaceInput } from "core/schemas/tasks.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";
import { PlusCircle, Layers, Users, Kanban, ArrowRight, Lock } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isPrivate?: boolean;
  ownerId: string;
  createdAt: string;
  _count: { boards: number; tasks: number; teams: number };
}

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data } = await axios.get<Workspace[]>("/api/workspaces");
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema) as any,
    defaultValues: { name: "", slug: "", description: "", logoUrl: "", isPrivate: false },
  });

  // Auto-generate slug from name
  const nameValue = watch("name");
  const autoSlug = nameValue
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const createMutation = useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const { data } = await axios.post<Workspace>("/api/workspaces", input);
      return data;
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      navigate(`/workspaces/${workspace.id}`);
    },
  });

  const onSubmit = (input: CreateWorkspaceInput) => {
    createMutation.mutate({ ...input, slug: input.slug || autoSlug });
  };

  return (
    <div className="space-y-8 font-sans animate-in-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">Workspaces</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Manage your team workspaces and task boards
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="gap-2 rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Workspace</span>
        </Button>
      </div>

      {creating && (
        <Card className="border border-border rounded-sm shadow-none bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Create Workspace</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              A workspace groups boards, teams, and tasks. You'll become the owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g., Engineering Team"
                  className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
                  {...register("name")}
                  onChange={(e) => {
                    register("name").onChange(e);
                    setValue(
                      "slug",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, "")
                        .trim()
                        .replace(/\s+/g, "-")
                    );
                  }}
                />
                {errors.name && <ErrorMessage message={errors.name.message} />}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-slug" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Slug (URL identifier)</Label>
                <Input
                  id="ws-slug"
                  placeholder="engineering-team"
                  className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
                  {...register("slug")}
                />
                {errors.slug && <ErrorMessage message={errors.slug.message} />}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-description" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <textarea
                  id="ws-description"
                  placeholder="Describe your workspace..."
                  className="w-full min-h-[60px] rounded-sm border border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary p-2 text-[13px]"
                  {...register("description")}
                />
                {errors.description && <ErrorMessage message={errors.description.message} />}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-logo" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Logo URL (Optional)</Label>
                <Input
                  id="ws-logo"
                  placeholder="https://example.com/logo.png"
                  className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
                  {...register("logoUrl")}
                />
                {errors.logoUrl && <ErrorMessage message={errors.logoUrl.message} />}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ws-private"
                  className="h-4 w-4 rounded-xs border-border bg-background text-primary focus:ring-primary cursor-pointer"
                  {...register("isPrivate")}
                />
                <Label htmlFor="ws-private" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                  Private Workspace (Only members can view)
                </Label>
              </div>

              {createMutation.error && (
                <ErrorAlert error={createMutation.error} fallback="Failed to create workspace" />
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                >
                  {createMutation.isPending ? "Creating..." : "Create Workspace"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-border rounded-sm shadow-none animate-pulse h-36" />
          ))}
        </div>
      )}

      {!isLoading && workspaces.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-sm bg-secondary/15">
          <Layers className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="font-display text-2xl font-normal tracking-tight text-foreground mb-1">No workspaces yet</h2>
          <p className="text-muted-foreground text-xs mb-6 max-w-sm">
            Create your first workspace to start managing boards and tasks.
          </p>
          <Button
            onClick={() => setCreating(true)}
            className="gap-2 rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Workspace</span>
          </Button>
        </div>
      )}

      {workspaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className="cursor-pointer border border-border rounded-sm hover:border-primary/40 hover:bg-secondary/20 transition-all duration-200 group shadow-none bg-card"
              onClick={() => navigate(`/workspaces/${ws.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="h-8 w-8 rounded-sm bg-secondary flex items-center justify-center mb-3 border border-border overflow-hidden">
                    {ws.logoUrl ? (
                      <img src={ws.logoUrl} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ws.isPrivate && (
                      <span title="Private Workspace" className="text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <CardTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                  <span>{ws.name}</span>
                </CardTitle>
                <CardDescription className="text-[11px] font-mono text-muted-foreground mt-0.5">{ws.slug}</CardDescription>
                {ws.description && (
                  <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{ws.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Kanban className="h-3.5 w-3.5 opacity-70" />
                    <span>{ws._count.boards} boards</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 opacity-70" />
                    <span>{ws._count.teams} teams</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
