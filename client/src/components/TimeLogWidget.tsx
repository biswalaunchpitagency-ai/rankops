import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus } from "lucide-react";
import ErrorAlert from "@/components/ErrorAlert";

interface TimeLog {
  id: string;
  hours: number;
  date: string;
  note?: string;
  user: { id: string; name: string };
}

interface Props {
  workspaceId: string;
  ticketId?: number;
  taskId?: string;
}

export default function TimeLogWidget({ workspaceId, ticketId, taskId }: Props) {
  const qc = useQueryClient();
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const queryParams = ticketId ? `?ticketId=${ticketId}` : `?taskId=${taskId}`;
  const queryKey = ["timelogs", workspaceId, ticketId ?? taskId];

  const { data: logs = [] } = useQuery<TimeLog[]>({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get(`/api/workspaces/${workspaceId}/timelogs${queryParams}`);
      return data;
    },
    enabled: !!(ticketId || taskId),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/workspaces/${workspaceId}/timelogs`, {
        hours: parseFloat(hours),
        note: note || undefined,
        ticketId,
        taskId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      // Invalidate target query to update hours used
      if (ticketId) {
        qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      } else if (taskId) {
        qc.invalidateQueries({ queryKey: ["board", workspaceId] });
      }
      setHours("");
      setNote("");
      setAddOpen(false);
    },
  });

  const totalHours = logs.reduce((s, l) => s + l.hours, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3 w-3" />
          Time Logged
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-foreground font-semibold">{totalHours.toFixed(1)}h total</span>
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="text-primary hover:opacity-70 transition-opacity cursor-pointer"
            title="Log time"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {addOpen && (
        <div className="border border-border rounded-sm p-3 bg-secondary/20 space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0.1}
              max={24}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Hours (e.g. 1.5)"
              className="rounded-sm h-7 text-[12px] flex-1 bg-background border-border"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="rounded-sm h-7 text-[12px] flex-1 bg-background border-border"
            />
          </div>
          <ErrorAlert error={addMutation.error} fallback="Failed to log time" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} className="h-6 text-[11px] rounded-sm px-2 border-border hover:bg-secondary">Cancel</Button>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!hours || isNaN(parseFloat(hours)) || addMutation.isPending}
              className="h-6 text-[11px] rounded-sm px-2 cursor-pointer"
            >
              {addMutation.isPending ? "Logging…" : "Log"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {logs.slice(0, 5).map((log) => (
          <div key={log.id} className="flex items-start justify-between text-[12px] py-1 border-b border-border last:border-0">
            <span className="text-muted-foreground">{log.user.name}</span>
            <div className="text-right">
              <span className="font-mono font-semibold text-foreground">{log.hours}h</span>
              {log.note && <span className="text-muted-foreground ml-2">{log.note}</span>}
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-[11px] text-muted-foreground">No time logged yet.</p>}
      </div>
    </div>
  );
}
