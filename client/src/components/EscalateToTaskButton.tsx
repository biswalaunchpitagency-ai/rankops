import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { escalateTicketSchema, type EscalateTicketInput } from "core/schemas/tasks.ts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { ArrowUpRight, Loader2, CheckCircle2, Link2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  boards: { id: string; name: string }[];
}

interface Task {
  id: string;
  taskKey: string;
  title: string;
  priority: string;
  boardColumn: { name: string } | null;
}

interface Ticket {
  id: number;
  subject: string;
  linkedTask?: Task | null;
}

export default function EscalateToTaskButton({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data } = await axios.get<Workspace[]>("/api/workspaces");
      return data;
    },
    enabled: open,
  });

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<EscalateTicketInput>({
    resolver: zodResolver(escalateTicketSchema),
    defaultValues: {
      ticketId: ticket.id,
      boardId: "",
      workspaceId: "",
    },
  });

  const escalateMutation = useMutation({
    mutationFn: async (input: EscalateTicketInput) => {
      const { data } = await axios.post<Task>("/api/tasks/escalate", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", String(ticket.id)] });
      setOpen(false);
    },
  });

  // Already has a linked task — show status badge instead
  if (ticket.linkedTask) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Escalated as task</p>
          <p className="font-mono text-xs font-semibold truncate">{ticket.linkedTask.taskKey}</p>
          {ticket.linkedTask.boardColumn && (
            <p className="text-xs text-muted-foreground">
              Status: <span className="font-medium">{ticket.linkedTask.boardColumn.name}</span>
            </p>
          )}
        </div>
        <Link2 className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setOpen(true)}>
        <ArrowUpRight className="h-3.5 w-3.5" />
        Escalate to Task
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Ticket to Task</DialogTitle>
            <DialogDescription>
              AI will analyze the ticket and create a structured engineering task on the selected board.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((d) => escalateMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label>Workspace</Label>
              <Select
                onValueChange={(v) => {
                  setSelectedWorkspaceId(v);
                  setValue("workspaceId", v);
                  setValue("boardId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.workspaceId && (
                <p className="text-xs text-destructive">{errors.workspaceId.message}</p>
              )}
            </div>

            {selectedWorkspace && (
              <div className="space-y-1.5">
                <Label>Board</Label>
                <Select onValueChange={(v) => setValue("boardId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedWorkspace.boards.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.boardId && (
                  <p className="text-xs text-destructive">{errors.boardId.message}</p>
                )}
              </div>
            )}

            {escalateMutation.error && (
              <ErrorAlert error={escalateMutation.error} fallback="Failed to escalate ticket" />
            )}

            {escalateMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI is analyzing the ticket and generating task details...
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={escalateMutation.isPending || !selectedWorkspaceId}>
                {escalateMutation.isPending ? "Creating..." : "Escalate with AI"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
