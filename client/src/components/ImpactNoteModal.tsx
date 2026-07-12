import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onConfirm: (impact: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function ImpactNoteModal({ open, onConfirm, onCancel, isPending }: Props) {
  const [impact, setImpact] = useState("");

  const handleConfirm = () => {
    if (!impact.trim()) return;
    onConfirm(impact.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md rounded-md border border-border bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">Add Impact Note</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Describe the measurable outcome of this work before marking it complete. This feeds the monthly client report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Impact Note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="e.g. Organic sessions increased 18% MoM; fixed 47 broken redirect chains."
              rows={4}
              className="rounded-sm resize-none text-[13px] bg-background border-border"
              autoFocus
            />
            {impact.trim() === "" && <p className="text-[11px] text-muted-foreground">Required to mark as complete.</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" onClick={onCancel} className="rounded-sm border-border hover:bg-secondary" disabled={isPending}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={!impact.trim() || isPending}
              className="rounded-sm cursor-pointer"
            >
              {isPending ? "Saving…" : "Mark Complete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
