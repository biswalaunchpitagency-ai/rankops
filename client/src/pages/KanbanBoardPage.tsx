import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, updateTaskSchema, type CreateTaskInput, type UpdateTaskInput, taskPriorities } from "core/schemas/tasks.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";
import BackLink from "@/components/BackLink";
import { PlusCircle, Ticket, Link2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskAssignee {
  id: string;
  name: string;
  email: string;
}

interface Task {
  id: string;
  taskKey: string;
  title: string;
  description: string;
  priority: string;
  position: number;
  boardColumnId: string;
  assignee: TaskAssignee | null;
  team: { id: string; name: string } | null;
  linkedTicket: { id: number; subject: string; status: string } | null;
}

interface BoardColumn {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

interface Board {
  id: string;
  name: string;
  workspaceId: string;
  columns: BoardColumn[];
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

const priorityConfig: Record<string, { label: string; className: string }> = {
  no_priority: { label: "No Priority", className: "bg-muted text-muted-foreground" },
  low: { label: "Low", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  medium: { label: "Medium", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  high: { label: "High", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  urgent: { label: "Urgent", className: "bg-red-600 text-white animate-pulse" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityConfig[priority] ?? priorityConfig.no_priority;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  index,
  onClick,
}: {
  task: Task;
  index: number;
  onClick: () => void;
}) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`select-none rounded-lg border bg-card p-3 shadow-sm transition-all duration-150 cursor-pointer hover:border-primary/40 hover:shadow-md ${
            snapshot.isDragging ? "shadow-lg border-primary/60 rotate-1 scale-[1.02]" : ""
          }`}
          onClick={onClick}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[11px] font-mono text-muted-foreground">{task.taskKey}</span>
            <PriorityBadge priority={task.priority} />
          </div>
          <p className="text-[13px] font-medium leading-snug mb-2 line-clamp-2">{task.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {task.assignee && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                  {task.assignee.name[0]}
                </span>
                {task.assignee.name}
              </span>
            )}
            {task.linkedTicket && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Ticket className="h-3 w-3" />
                #{task.linkedTicket.id}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KanbanBoardPage() {
  const { id: boardId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [createInColumnId, setCreateInColumnId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: board, isLoading } = useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const { data } = await axios.get<Board>(`/api/boards/${boardId}`);
      return data;
    },
    enabled: !!boardId,
  });

  // Optimistic drag-drop
  const moveMutation = useMutation({
    mutationFn: async (vars: { taskId: string; boardColumnId: string; position: number }) => {
      await axios.put("/api/boards/tasks/move", vars);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await axios.post<Task>("/api/tasks", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setCreateInColumnId(null);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateTaskInput) => {
      const { data } = await axios.put<Task>(`/api/tasks/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setSelectedTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await axios.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setSelectedTask(null);
    },
  });

  const createForm = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "no_priority",
      boardId: boardId!,
      boardColumnId: "",
      workspaceId: board?.workspaceId ?? "",
    },
  });

  const updateForm = useForm<UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !board) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistically reorder in cache
    queryClient.setQueryData<Board>(["board", boardId], (old) => {
      if (!old) return old;
      const newColumns = old.columns.map((col) => ({ ...col, tasks: [...col.tasks] }));
      const srcCol = newColumns.find((c) => c.id === source.droppableId)!;
      const dstCol = newColumns.find((c) => c.id === destination.droppableId)!;
      const [moved] = srcCol.tasks.splice(source.index, 1);
      dstCol.tasks.splice(destination.index, 0, { ...moved, boardColumnId: destination.droppableId });
      return { ...old, columns: newColumns };
    });

    moveMutation.mutate({
      taskId: draggableId,
      boardColumnId: destination.droppableId,
      position: destination.index,
    });
  };

  const openCreateInColumn = (columnId: string) => {
    setCreateInColumnId(columnId);
    createForm.reset({
      title: "",
      description: "",
      priority: "no_priority",
      boardId: boardId!,
      boardColumnId: columnId,
      workspaceId: board?.workspaceId ?? "",
    });
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    updateForm.reset({
      title: task.title,
      description: task.description,
      priority: task.priority as any,
      assigneeId: task.assignee?.id ?? undefined,
      teamId: task.team?.id ?? undefined,
    });
  };

  return (
    <div className="space-y-4 h-full">
      <BackLink to={board ? `/workspaces/${board.workspaceId}` : "/workspaces"}>
        Back to Workspace
      </BackLink>

      {isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-72 shrink-0 h-96 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {board && !isLoading && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-8">
              {board.columns.map((column) => (
                <div
                  key={column.id}
                  className="w-72 shrink-0 rounded-xl bg-muted/50 border flex flex-col"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold">{column.name}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {column.tasks.length}
                      </span>
                    </div>
                    <button
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      onClick={() => openCreateInColumn(column.id)}
                      title="Add task"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Task list drop zone */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 flex flex-col gap-2 px-2 pb-2 min-h-[80px] transition-colors rounded-b-xl ${
                          snapshot.isDraggingOver ? "bg-primary/5" : ""
                        }`}
                      >
                        {column.tasks.map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            onClick={() => openTaskDetail(task)}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </>
      )}

      {/* Create task dialog */}
      <Dialog open={!!createInColumnId} onOpenChange={(open) => !open && setCreateInColumnId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to{" "}
              <strong>
                {board?.columns.find((c) => c.id === createInColumnId)?.name ?? "column"}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" placeholder="Task title" {...createForm.register("title")} />
              {createForm.formState.errors.title && (
                <ErrorMessage message={createForm.formState.errors.title.message} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                placeholder="Add details for the task..."
                rows={3}
                {...createForm.register("description")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                defaultValue="no_priority"
                onValueChange={(v) => createForm.setValue("priority", v as any)}
              >
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskPriorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityConfig[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createMutation.error && (
              <ErrorAlert error={createMutation.error} fallback="Failed to create task" />
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreateInColumnId(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{selectedTask?.taskKey}</span>
              {selectedTask?.linkedTicket && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Link2 className="h-3 w-3" />
                  Ticket #{selectedTask.linkedTicket.id}
                </Badge>
              )}
            </div>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <form
              onSubmit={updateForm.handleSubmit((d) =>
                updateMutation.mutate({ id: selectedTask.id, ...d })
              )}
              className="space-y-4 pt-1"
            >
              <div className="space-y-1.5">
                <Label htmlFor="ut-title">Title</Label>
                <Input id="ut-title" {...updateForm.register("title")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-desc">Description</Label>
                <Textarea id="ut-desc" rows={4} {...updateForm.register("description")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-priority">Priority</Label>
                <Select
                  defaultValue={selectedTask.priority}
                  onValueChange={(v) => updateForm.setValue("priority", v as any)}
                >
                  <SelectTrigger id="ut-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskPriorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {priorityConfig[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTask.linkedTicket && (
                <Card className="border-dashed">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Ticket className="h-3 w-3" />
                      Linked ticket:{" "}
                      <strong>#{selectedTask.linkedTicket.id}</strong> —{" "}
                      {selectedTask.linkedTicket.subject}
                    </p>
                    <Badge className="mt-1.5 text-[10px]" variant="secondary">
                      {selectedTask.linkedTicket.status}
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {updateMutation.error && (
                <ErrorAlert error={updateMutation.error} fallback="Failed to update task" />
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(selectedTask.id)}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedTask(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
