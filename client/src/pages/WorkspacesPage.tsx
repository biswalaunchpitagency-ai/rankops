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
import { PlusCircle, Layers, Users, LayoutKanban, ArrowRight } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
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
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: "", slug: "" },
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your team workspaces and task boards
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {creating && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Create Workspace</CardTitle>
            <CardDescription>
              A workspace groups boards, teams, and tasks. You'll become the owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g., Engineering Team"
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
                <Label htmlFor="ws-slug">Slug (URL identifier)</Label>
                <Input
                  id="ws-slug"
                  placeholder="engineering-team"
                  {...register("slug")}
                />
                {errors.slug && <ErrorMessage message={errors.slug.message} />}
              </div>

              {createMutation.error && (
                <ErrorAlert error={createMutation.error} fallback="Failed to create workspace" />
              )}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Workspace"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>
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
            <Card key={i} className="animate-pulse h-36" />
          ))}
        </div>
      )}

      {!isLoading && workspaces.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-1">No workspaces yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Create your first workspace to start managing boards and tasks.
          </p>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Workspace
          </Button>
        </div>
      )}

      {workspaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
              onClick={() => navigate(`/workspaces/${ws.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <CardTitle className="text-base">{ws.name}</CardTitle>
                <CardDescription className="text-xs font-mono">{ws.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <LayoutKanban className="h-3.5 w-3.5" />
                    {ws._count.boards} boards
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {ws._count.teams} teams
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
