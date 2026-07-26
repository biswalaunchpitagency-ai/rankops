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

  // Fetch the selected workspace detail to get boards (list endpoint doesn't include boards)
  const { data: selectedWorkspace } = useQuery<Workspace>({
    queryKey: ["workspace", selectedWorkspaceId],
    queryFn: async () => {
      const { data } = await axios.get<Workspace>(`/api/workspaces/${selectedWorkspaceId}`);
      return data;
    },
    enabled: !!selectedWorkspaceId,
  });


  const { handleSubmit, setValue, formState: { errors } } = useForm<EscalateTicketInput>({
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
      <div className="flex items-center gap-3 rounded-sm border border-border p-3 bg-[#edf3ec]/20 shadow-none font-sans">
        <CheckCircle2 className="h-4 w-4 text-[#346538] shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#346538]">Escalated</p>
          <p className="font-mono text-xs font-semibold truncate text-foreground">{ticket.linkedTask.taskKey}</p>
          {ticket.linkedTask.boardColumn && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Status: <span className="font-medium text-foreground">{ticket.linkedTask.boardColumn.name}</span>
            </p>
          )}
        </div>
        <Link2 className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 w-full rounded-sm border border-border bg-background hover:bg-secondary text-foreground transition-all duration-200 active:scale-98 shadow-none cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <ArrowUpRight className="h-3.5 w-3.5 text-[#7c3aed]" />
        <span className="text-[13px] font-medium">Escalate to Task</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm border border-border shadow-lg bg-background font-sans max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              Escalate Ticket to Task
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              AI will analyze the ticket and create a structured engineering task on the selected board.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((d) => escalateMutation.mutate(d))}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Workspace
              </Label>
              <Select
                onValueChange={(v) => {
                  setSelectedWorkspaceId(v);
                  setValue("workspaceId", v);
                  setValue("boardId", "");
                }}
              >
                <SelectTrigger className="rounded-sm border-border focus:ring-primary shadow-none text-[13px]">
                  <SelectValue placeholder="Select workspace..." />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id} className="rounded-sm text-[13px]">
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.workspaceId && (
                <p className="text-[11px] text-destructive">{errors.workspaceId.message}</p>
              )}
            </div>

            {selectedWorkspace && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Board
                </Label>
                <Select onValueChange={(v) => setValue("boardId", v)}>
                  <SelectTrigger className="rounded-sm border-border focus:ring-primary shadow-none text-[13px]">
                    <SelectValue placeholder="Select board..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    {(selectedWorkspace.boards ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id} className="rounded-sm text-[13px]">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.boardId && (
                  <p className="text-[11px] text-destructive">{errors.boardId.message}</p>
                )}
              </div>
            )}

            {escalateMutation.error && (
              <ErrorAlert error={escalateMutation.error} fallback="Failed to escalate ticket" />
            )}

            {escalateMutation.isPending && (
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground rounded-sm border border-border bg-secondary/50 px-3 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-[#7c3aed]" />
                <span>AI is analyzing the ticket and generating task details...</span>
              </div>
            )}

            <div className="flex gap-2 pt-2 justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-sm border border-border bg-background hover:bg-secondary text-foreground text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={escalateMutation.isPending || !selectedWorkspaceId}
                className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
              >
                {escalateMutation.isPending ? "Creating..." : "Escalate with AI"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
