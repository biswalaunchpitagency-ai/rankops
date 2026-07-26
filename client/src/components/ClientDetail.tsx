import type { Client } from "./ClientCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayCircle, Pencil, Trash2 } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: (Client & { hoursUsedThisMonth: number }) | null;
  onEdit: () => void;
  onDelete: () => void;
  generatePackMutation: UseMutationResult<any, Error, string>;
}

export default function ClientDetail({ open, onOpenChange, client, onEdit, onDelete, generatePackMutation }: Props) {
  if (!client) return null;

  const pct = client.retainerHours > 0
    ? Math.min(100, (client.hoursUsedThisMonth / client.retainerHours) * 100)
    : 0;

  const handleGeneratePack = () => {
    if (confirm(`Generate 4 standard retainer tasks for ${client.name}?`)) {
      generatePackMutation.mutate(client.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-md border border-border bg-background">
        <DialogHeader>
          <div className="flex items-center justify-between border-b border-border pb-3 mr-6">
            <div>
              <DialogTitle className="font-display text-xl font-normal text-foreground">{client.name}</DialogTitle>
              {client.type && <p className="text-[12px] text-muted-foreground mt-0.5">{client.type}</p>}
            </div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-secondary text-muted-foreground">
              {client.status}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Burn rate */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Retainer status</span>
            <div className="bg-secondary/20 border border-border/60 rounded-md p-3">
              <div className="flex justify-between text-[13px] font-medium text-foreground mb-1">
                <span>{client.hoursUsedThisMonth.toFixed(1)} / {client.retainerHours}h logged</span>
                <span>{Math.round(pct)}% Used</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct > 95 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : "bg-green-600"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Email domains */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Email domains</span>
            <div className="flex flex-wrap gap-1.5">
              {client.emailDomains && client.emailDomains.length > 0 ? (
                client.emailDomains.map((dom) => (
                  <span key={dom} className="text-[11px] font-mono bg-secondary px-2 py-0.5 rounded-sm border border-border/80">
                    {dom}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-muted-foreground italic">No domains configured.</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Notes</span>
            <div className="text-[13px] text-muted-foreground bg-secondary/10 border border-border/40 rounded-sm p-3 min-h-[60px] whitespace-pre-wrap">
              {client.notes || <span className="italic opacity-60">No notes available.</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-border mt-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">Actions</span>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-start gap-2 h-9 rounded-sm border-border hover:bg-secondary w-full"
                onClick={handleGeneratePack}
                disabled={generatePackMutation.isPending}
              >
                <PlayCircle className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-medium text-foreground">
                  {generatePackMutation.isPending ? "Generating..." : "Generate Retainer Task Pack"}
                </span>
              </Button>
              {generatePackMutation.isSuccess && (
                <p className="text-[11px] text-green-600 font-mono">Successfully generated 4 retainer tasks on the board.</p>
              )}
              {generatePackMutation.isError && (
                <p className="text-[11px] text-destructive font-mono">Failed to generate retainer pack.</p>
              )}

              <div className="flex gap-2 w-full mt-1">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-9 rounded-sm border-border hover:bg-secondary"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="text-[13px]">Edit Client</span>
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2 h-9 rounded-sm hover:bg-destructive/90"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="text-[13px]">Delete</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
