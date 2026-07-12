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
import StatusBadge from "@/components/StatusBadge";
import { PlusCircle, Ticket, Link2, MoreHorizontal, Trash2, Plus } from "lucide-react";
import TimeLogWidget from "@/components/TimeLogWidget";
import ChecklistWidget from "@/components/ChecklistWidget";
import ImpactNoteModal from "@/components/ImpactNoteModal";

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
  checklist?: any;
  impact?: string | null;
  phase?: string | null;
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
  no_priority: { label: "No Priority", className: "bg-secondary text-muted-foreground border border-border" },
  low: { label: "Low", className: "bg-[#edf3ec] text-[#346538] border border-[#346538]/10" },
  medium: { label: "Medium", className: "bg-[#fbf3db] text-[#956400] border border-[#956400]/10" },
  high: { label: "High", className: "bg-[#fdebec] text-[#9f2f2d] border border-[#9f2f2d]/10" },
  urgent: { label: "Urgent", className: "bg-[#9f2f2d] text-[#ffffff] border border-transparent animate-pulse" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityConfig[priority] ?? priorityConfig.no_priority;
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${cfg.className}`}>
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
          className={`select-none rounded-sm border border-border bg-card p-3 shadow-none transition-all duration-150 cursor-pointer hover:border-primary/40 hover:bg-secondary/10 ${
            snapshot.isDragging ? "shadow-md border-primary/60 rotate-1 scale-[1.01] bg-card" : ""
          }`}
          onClick={onClick}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{task.taskKey}</span>
            <PriorityBadge priority={task.priority} />
          </div>
          <p className="text-[13px] font-medium leading-snug mb-2 line-clamp-2 text-foreground">{task.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {task.assignee && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-4.5 w-4.5 rounded-sm bg-secondary flex items-center justify-center text-[9px] font-bold text-foreground border border-border">
                  {task.assignee.name[0]}
                </span>
                <span className="font-medium text-foreground">{task.assignee.name}</span>
              </span>
            )}
            {task.linkedTicket && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-sm px-1.5 py-0.5 bg-secondary/30">
                <Ticket className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">#{task.linkedTicket.id}</span>
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
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; boardColumnId: string; position: number } | null>(null);

  // Column operation states
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [columnToDelete, setColumnToDelete] = useState<BoardColumn | null>(null);
  const [deleteActionType, setDeleteActionType] = useState<"move" | "delete">("move");
  const [targetColumnIdForMove, setTargetColumnIdForMove] = useState("");
  const [menuOpenColumnId, setMenuOpenColumnId] = useState<string | null>(null);

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

  const addColumnMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await axios.post(`/api/boards/${boardId}/columns`, { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setIsAddColumnOpen(false);
      setNewColumnName("");
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: async (columnIds: string[]) => {
      await axios.put(`/api/boards/${boardId}/columns/reorder`, { columnIds });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (vars: { columnId: string; targetColumnId?: string }) => {
      await axios.delete(`/api/boards/${boardId}/columns/${vars.columnId}`, {
        data: { targetColumnId: vars.targetColumnId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setColumnToDelete(null);
      setTargetColumnIdForMove("");
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
    resolver: zodResolver(createTaskSchema) as any,
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

    const { source, destination, draggableId, type } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === "column") {
      // Optimistically update column position in cache
      queryClient.setQueryData<Board>(["board", boardId], (old) => {
        if (!old) return old;
        const newColumns = [...old.columns];
        const [moved] = newColumns.splice(source.index, 1);
        newColumns.splice(destination.index, 0, moved);
        return { ...old, columns: newColumns };
      });

      const newColumnIds = board.columns.map((c) => c.id);
      const [movedId] = newColumnIds.splice(source.index, 1);
      newColumnIds.splice(destination.index, 0, movedId);

      reorderColumnsMutation.mutate(newColumnIds);
      return;
    }

    const dstCol = board.columns.find((c) => c.id === destination.droppableId)!;
    const srcCol = board.columns.find((c) => c.id === source.droppableId)!;
    const task = srcCol.tasks.find((t) => t.id === draggableId)!;

    if (dstCol.name === "Done" && !task.impact) {
      setPendingMove({
        taskId: draggableId,
        boardColumnId: destination.droppableId,
        position: destination.index,
      });
      setImpactModalOpen(true);
      return;
    }

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

  const handleTaskImpactConfirm = (impact: string) => {
    if (!pendingMove) return;
    axios.put(`/api/tasks/${pendingMove.taskId}`, { impact }).then(() => {
      // Optimistically update column position in cache
      queryClient.setQueryData<Board>(["board", boardId], (old) => {
        if (!old) return old;
        const newColumns = old.columns.map((col) => ({ ...col, tasks: [...col.tasks] }));
        const srcCol = newColumns.find((c) => c.tasks.some((t) => t.id === pendingMove!.taskId))!;
        const dstCol = newColumns.find((c) => c.id === pendingMove!.boardColumnId)!;
        const movedIndex = srcCol.tasks.findIndex((t) => t.id === pendingMove!.taskId);
        const [moved] = srcCol.tasks.splice(movedIndex, 1);
        dstCol.tasks.splice(pendingMove!.position, 0, { ...moved, boardColumnId: pendingMove!.boardColumnId, impact });
        return { ...old, columns: newColumns };
      });

      moveMutation.mutate({
        taskId: pendingMove.taskId,
        boardColumnId: pendingMove.boardColumnId,
        position: pendingMove.position,
      }, {
        onSuccess: () => {
          setImpactModalOpen(false);
          setPendingMove(null);
        }
      });
    });
  };

  const handleTaskImpactCancel = () => {
    setImpactModalOpen(false);
    setPendingMove(null);
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });
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

  const handleDeleteColumnConfirm = () => {
    if (!columnToDelete) return;
    deleteColumnMutation.mutate({
      columnId: columnToDelete.id,
      targetColumnId: deleteActionType === "move" && targetColumnIdForMove ? targetColumnIdForMove : undefined,
    });
  };

  return (
    <div className="space-y-6 h-full font-sans animate-in-page">
      <BackLink to={board ? `/workspaces/${board.workspaceId}` : "/workspaces"}>
        Back to Workspace
      </BackLink>

      {isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 shrink-0 h-96 rounded-sm bg-muted animate-pulse border border-border" />
          ))}
        </div>
      )}

      {board && !isLoading && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">{board.name}</h1>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
              {(providedDroppable) => (
                <div
                  ref={providedDroppable.innerRef}
                  {...providedDroppable.droppableProps}
                  className="flex gap-4 overflow-x-auto pb-8 items-start"
                >
                  {board.columns.map((column, index) => (
                    <Draggable draggableId={column.id} index={index} key={column.id}>
                      {(providedDraggable, snapshotDraggable) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          className={`w-72 shrink-0 rounded-sm bg-secondary/40 border border-border flex flex-col ${
                            snapshotDraggable.isDragging ? "shadow-md border-primary/40 bg-secondary/50" : ""
                          }`}
                        >
                          {/* Column header */}
                          <div
                            {...providedDraggable.dragHandleProps}
                            className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-secondary/35 cursor-grab active:cursor-grabbing select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-foreground">{column.name}</span>
                              <span className="rounded-sm bg-background border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                {column.tasks.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                onClick={() => openCreateInColumn(column.id)}
                                title="Add task"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>

                              {/* Column Action Menu */}
                              <div className="relative">
                                <button
                                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenColumnId(menuOpenColumnId === column.id ? null : column.id);
                                  }}
                                  title="Column actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {menuOpenColumnId === column.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenColumnId(null);
                                      }}
                                    />
                                    <div className="absolute right-0 mt-1 w-40 rounded-sm border border-border bg-popover text-popover-foreground p-1 shadow-md z-20 font-sans text-xs">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMenuOpenColumnId(null);
                                          openCreateInColumn(column.id);
                                        }}
                                        className="w-full text-left px-2 py-1.5 hover:bg-secondary rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Task
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMenuOpenColumnId(null);
                                          setColumnToDelete(column);
                                          setTargetColumnIdForMove("");
                                          setDeleteActionType("move");
                                        }}
                                        className="w-full text-left px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete Column
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Task list drop zone */}
                          <Droppable droppableId={column.id} type="task">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`flex-1 flex flex-col gap-2 p-2 min-h-[150px] transition-colors rounded-b-sm ${
                                  snapshot.isDraggingOver ? "bg-secondary/60" : ""
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
                      )}
                    </Draggable>
                  ))}
                  {providedDroppable.placeholder}

                  {/* Add Column Card */}
                  <div className="w-72 shrink-0 rounded-sm border border-dashed border-border p-3 hover:bg-secondary/15 transition-all">
                    {isAddColumnOpen ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newColumnName.trim()) {
                            addColumnMutation.mutate(newColumnName.trim());
                          }
                        }}
                        className="space-y-3"
                      >
                        <Input
                          placeholder="Column name..."
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px] h-8.5"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-xs h-7.5 px-3 shadow-none border-0"
                            disabled={addColumnMutation.isPending}
                          >
                            {addColumnMutation.isPending ? "Adding..." : "Add"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-xs h-7.5 px-3 shadow-none"
                            onClick={() => setIsAddColumnOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setIsAddColumnOpen(true);
                          setNewColumnName("");
                        }}
                        className="w-full py-2 flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Add Column
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </>
      )}

      {/* Create task dialog */}
      <Dialog open={!!createInColumnId} onOpenChange={(open) => !open && setCreateInColumnId(null)}>
        <DialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              Create Task
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new task to{" "}
              <strong className="text-foreground">
                {board?.columns.find((c) => c.id === createInColumnId)?.name ?? "column"}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
              <Input
                id="task-title"
                placeholder="Task title"
                className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
                {...createForm.register("title")}
              />
              {createForm.formState.errors.title && (
                <ErrorMessage message={createForm.formState.errors.title.message} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea
                id="task-desc"
                placeholder="Add details for the task..."
                rows={3}
                className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px] resize-none"
                {...createForm.register("description")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Select
                defaultValue="no_priority"
                onValueChange={(v) => createForm.setValue("priority", v as any)}
              >
                <SelectTrigger id="task-priority" className="rounded-sm border-border focus:ring-primary shadow-none text-[13px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  {taskPriorities.map((p) => (
                    <SelectItem key={p} value={p} className="rounded-sm text-[13px]">
                      {priorityConfig[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createMutation.error && (
              <ErrorAlert error={createMutation.error} fallback="Failed to create task" />
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                onClick={() => setCreateInColumnId(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
              >
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-lg rounded-sm border border-border shadow-lg bg-background font-sans">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{selectedTask?.taskKey}</span>
              {selectedTask?.linkedTicket && (
                <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  <span>Ticket #{selectedTask.linkedTicket.id}</span>
                </span>
              )}
            </div>
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <form
              onSubmit={updateForm.handleSubmit((d) =>
                updateMutation.mutate({ id: selectedTask.id, ...d })
              )}
              className="space-y-4 pt-1"
            >
              <div className="space-y-1.5">
                <Label htmlFor="ut-title" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
                <Input
                  id="ut-title"
                  className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px]"
                  {...updateForm.register("title")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-desc" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea
                  id="ut-desc"
                  rows={4}
                  className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px] resize-none"
                  {...updateForm.register("description")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-priority" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
                <Select
                  defaultValue={selectedTask.priority}
                  onValueChange={(v) => updateForm.setValue("priority", v as any)}
                >
                  <SelectTrigger id="ut-priority" className="rounded-sm border-border focus:ring-primary shadow-none text-[13px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    {taskPriorities.map((p) => (
                      <SelectItem key={p} value={p} className="rounded-sm text-[13px]">
                        {priorityConfig[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTask.linkedTicket && (
                <Card className="border border-border border-dashed rounded-sm bg-secondary/20 shadow-none">
                  <CardContent className="p-3.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        Linked ticket:{" "}
                        <strong className="text-foreground">#{selectedTask.linkedTicket.id}</strong> —{" "}
                        <span className="font-medium text-foreground">{selectedTask.linkedTicket.subject}</span>
                      </span>
                    </p>
                    <div className="mt-2.5">
                      <StatusBadge status={selectedTask.linkedTicket.status as any} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Time Logging */}
              <div className="border-t border-border pt-4">
                <TimeLogWidget workspaceId={board?.workspaceId ?? ""} taskId={selectedTask.id} />
              </div>

              {/* Checklist */}
              {selectedTask.checklist && Array.isArray(selectedTask.checklist) && selectedTask.checklist.length > 0 && (
                <div className="border-t border-border pt-4">
                  <ChecklistWidget
                    checklist={selectedTask.checklist as { text: string; done: boolean }[]}
                    onUpdate={(updated) => updateMutation.mutate({ id: selectedTask.id, checklist: updated })}
                  />
                </div>
              )}

              {/* Impact Note (if set) */}
              {selectedTask.impact && (
                <div className="border-t border-border pt-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Impact</p>
                  <p className="text-[12px] text-foreground font-sans">{selectedTask.impact}</p>
                </div>
              )}

              {updateMutation.error && (
                <ErrorAlert error={updateMutation.error} fallback="Failed to update task" />
              )}

              <div className="flex items-center gap-2 justify-end pt-3 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  className="rounded-sm bg-[#9f2f2d] hover:bg-[#b03a37] text-white text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2 mr-auto"
                  onClick={() => deleteMutation.mutate(selectedTask.id)}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                  onClick={() => setSelectedTask(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete column dialog */}
      <Dialog open={!!columnToDelete} onOpenChange={(open) => !open && setColumnToDelete(null)}>
        <DialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              Delete Column: {columnToDelete?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action cannot be undone. Please specify what to do with the cards inside this column.
            </DialogDescription>
          </DialogHeader>

          {columnToDelete && (
            <div className="space-y-4 pt-1">
              {columnToDelete.tasks.length > 0 ? (
                <>
                  <div className="rounded-sm border border-[#fbf3db] bg-[#fbf3db]/10 p-3 text-xs text-[#956400]">
                    This column contains <strong>{columnToDelete.tasks.length}</strong> task(s).
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Safeguard Action</Label>
                    <div className="space-y-2.5">
                      <label className="flex items-start gap-2.5 cursor-pointer text-[13px] text-foreground">
                        <input
                          type="radio"
                          name="delete-action"
                          className="mt-0.5"
                          checked={deleteActionType === "move"}
                          onChange={() => setDeleteActionType("move")}
                        />
                        <div>
                          <span className="font-medium">Move tasks to another column</span>
                          <p className="text-xs text-muted-foreground">Select a target column to preserve these tasks.</p>
                        </div>
                      </label>

                      {deleteActionType === "move" && (
                        <Select
                          value={targetColumnIdForMove}
                          onValueChange={setTargetColumnIdForMove}
                        >
                          <SelectTrigger className="rounded-sm border-border focus:ring-primary shadow-none text-[13px] h-9 ml-6 w-[calc(100%-24px)]">
                            <SelectValue placeholder="Select column..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-sm">
                            {board?.columns
                              .filter((c) => c.id !== columnToDelete.id)
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id} className="rounded-sm text-[13px]">
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}

                      <label className="flex items-start gap-2.5 cursor-pointer text-[13px] text-foreground">
                        <input
                          type="radio"
                          name="delete-action"
                          className="mt-0.5"
                          checked={deleteActionType === "delete"}
                          onChange={() => setDeleteActionType("delete")}
                        />
                        <div>
                          <span className="font-medium text-destructive">Delete all tasks</span>
                          <p className="text-xs text-muted-foreground">Permanently delete all tasks in this column.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-foreground">This column is empty. Are you sure you want to delete it?</p>
              )}

              {deleteColumnMutation.error && (
                <ErrorAlert error={deleteColumnMutation.error} fallback="Failed to delete column" />
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                  onClick={() => setColumnToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteColumnMutation.isPending || (columnToDelete.tasks.length > 0 && deleteActionType === "move" && !targetColumnIdForMove)}
                  className="rounded-sm bg-[#9f2f2d] hover:bg-[#b03a37] text-white text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                  onClick={handleDeleteColumnConfirm}
                >
                  {deleteColumnMutation.isPending ? "Deleting..." : "Delete Column"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImpactNoteModal
        open={impactModalOpen}
        onConfirm={handleTaskImpactConfirm}
        onCancel={handleTaskImpactCancel}
        isPending={moveMutation.isPending}
      />
    </div>
  );
}
