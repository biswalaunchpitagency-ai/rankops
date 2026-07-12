import { CheckSquare, Square } from "lucide-react";

interface CheckItem { text: string; done: boolean; }

interface Props {
  checklist: CheckItem[];
  onUpdate: (updated: CheckItem[]) => void;
  disabled?: boolean;
}

export default function ChecklistWidget({ checklist, onUpdate, disabled }: Props) {
  const toggle = (index: number) => {
    const updated = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    onUpdate(updated);
  };

  const doneCount = checklist.filter((i) => i.done).length;
  const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  if (checklist.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Checklist</span>
        <span className="text-[10px] font-mono text-muted-foreground">{doneCount}/{checklist.length} · {pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1">
        {checklist.map((item, i) => (
          <button
            key={i}
            onClick={() => !disabled && toggle(i)}
            disabled={disabled}
            className={`flex items-start gap-2 w-full text-left py-1 px-1 rounded-sm hover:bg-secondary/40 transition-colors ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            {item.done
              ? <CheckSquare className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
            <span className={`text-[12px] ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
