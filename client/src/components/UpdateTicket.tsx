import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { type Ticket } from "core/constants/ticket.ts";
import { agentTicketStatuses, statusLabel } from "core/constants/ticket-status.ts";
import TimeLogWidget from "@/components/TimeLogWidget";
import ChecklistWidget from "@/components/ChecklistWidget";
import ImpactNoteModal from "@/components/ImpactNoteModal";
import { ticketCategories, categoryLabel } from "core/constants/ticket-category.ts";
import { Card, CardContent } from "@/components/ui/card";
import EscalateToTaskButton from "@/components/EscalateToTaskButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Agent {
  id: string;
  name: string;
}

interface UpdateTicketProps {
  ticket: Ticket;
}

export default function UpdateTicket({ ticket }: UpdateTicketProps) {
  const queryClient = useQueryClient();
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data } = await axios.get<{ agents: Agent[] }>("/api/agents");
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await axios.patch(`/api/tickets/${ticket.id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", String(ticket.id)] });
    },
  });

  return (
    <Card className="w-full h-fit border border-border rounded-sm shadow-none bg-card font-sans">
      <CardContent className="pt-5 pb-5 px-5 space-y-5">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <Select
            value={ticket.status}
            onValueChange={(value) => {
              if ((value === "resolved" || value === "closed") && !ticket.impact) {
                setPendingStatus(value);
                setImpactModalOpen(true);
              } else {
                updateMutation.mutate({ status: value });
              }
            }}
          >
            <SelectTrigger size="sm" className="w-full rounded-sm border-border focus:ring-primary shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              {agentTicketStatuses.map((s) => (
                <SelectItem key={s} value={s} className="rounded-sm text-[13px]">
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </span>
          <Select
            value={ticket.category ?? "none"}
            onValueChange={(value) =>
              updateMutation.mutate({
                category: value === "none" ? null : value,
              })
            }
          >
            <SelectTrigger size="sm" className="w-full rounded-sm border-border focus:ring-primary shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="none" className="rounded-sm text-[13px]">None</SelectItem>
              {ticketCategories.map((c) => (
                <SelectItem key={c} value={c} className="rounded-sm text-[13px]">
                  {categoryLabel[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned To
          </span>
          <Select
            value={ticket.assignedTo?.id ?? "unassigned"}
            onValueChange={(value) =>
              updateMutation.mutate({
                assignedToId: value === "unassigned" ? null : value,
              })
            }
          >
            <SelectTrigger size="sm" className="w-full rounded-sm border-border focus:ring-primary shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="unassigned" className="rounded-sm text-[13px]">Unassigned</SelectItem>
              {agentsData?.agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="rounded-sm text-[13px]">
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-3 border-t border-border">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Engineering
          </span>
          <EscalateToTaskButton ticket={ticket} />
        </div>

        {/* Time Logging */}
        <div className="border-t border-border pt-4">
          <TimeLogWidget
            workspaceId={ticket.workspaceId}
            ticketId={ticket.id}
          />
        </div>

        {/* Checklist */}
        {ticket.checklist && Array.isArray(ticket.checklist) && ticket.checklist.length > 0 && (
          <div className="border-t border-border pt-4">
            <ChecklistWidget
              checklist={ticket.checklist as { text: string; done: boolean }[]}
              onUpdate={(updated) => updateMutation.mutate({ checklist: updated })}
            />
          </div>
        )}

        {/* Impact Note (if set) */}
        {ticket.impact && (
          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Impact</p>
            <p className="text-[12px] text-foreground font-sans">{ticket.impact}</p>
          </div>
        )}

        <ImpactNoteModal
          open={impactModalOpen}
          onConfirm={(impact) => {
            updateMutation.mutate({ status: pendingStatus!, impact }, {
              onSuccess: () => {
                setImpactModalOpen(false);
                setPendingStatus(null);
              }
            });
          }}
          onCancel={() => {
            setImpactModalOpen(false);
            setPendingStatus(null);
          }}
          isPending={updateMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
