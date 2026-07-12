import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, Wrench } from "lucide-react";

interface SOPStep { id: string; text: string; position: number; }
interface SOP { id: string; title: string; category: string; tools?: string | null; steps: SOPStep[]; }

interface Props { sop: SOP; onDelete: (id: string) => void; }

export default function SopCard({ sop, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-md bg-background overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/35 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-[13px] font-semibold text-foreground">{sop.title}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{sop.category}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete SOP: "${sop.title}"?`)) onDelete(sop.id); }}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-sm cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border bg-secondary/5 px-6 py-4 space-y-3">
          {sop.tools && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-secondary/40 border border-border/40 px-2 py-1 rounded-sm w-fit">
              <Wrench className="h-3 w-3" />
              <span>Tools: {sop.tools}</span>
            </div>
          )}
          <div className="space-y-2">
            {sop.steps && sop.steps.length > 0 ? (
              sop.steps.map((step, i) => (
                <div key={step.id} className="flex items-start gap-3 text-[13px] text-foreground leading-relaxed">
                  <span className="text-[11px] font-mono text-muted-foreground w-6 text-right shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="flex-1">{step.text}</span>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-muted-foreground italic">No steps defined for this SOP.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
