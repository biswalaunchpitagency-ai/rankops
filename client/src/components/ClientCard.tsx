export interface Client {
  id: string;
  name: string;
  type?: string | null;
  retainerHours: number;
  rate: number;
  status: string;
  notes?: string | null;
  emailDomains: string[];
}

interface Props {
  client: Client & { hoursUsedThisMonth: number };
  onClick: () => void;
}

export default function ClientCard({ client, onClick }: Props) {
  const pct = client.retainerHours > 0
    ? Math.min(100, (client.hoursUsedThisMonth / client.retainerHours) * 100)
    : 0;
  const burnBarColor = pct > 95 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : "bg-green-600";

  const statusColors: Record<string, string> = {
    Active: "bg-[#edf3ec] text-[#346538]",
    Onboarding: "bg-[#fbf3db] text-[#956400]",
    Paused: "bg-secondary text-muted-foreground",
  };

  return (
    <div
      onClick={onClick}
      className="bg-background border border-border rounded-md p-5 cursor-pointer hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all"
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-foreground">{client.name}</h3>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm ${statusColors[client.status] ?? "bg-secondary text-muted-foreground"}`}>
          {client.status}
        </span>
      </div>
      {client.type && <p className="text-[12px] text-muted-foreground mb-3">{client.type}</p>}

      <div className="text-[11px] text-muted-foreground mb-1 font-mono">
        Retainer burn — {client.hoursUsedThisMonth.toFixed(1)} / {client.retainerHours}h ({Math.round(pct)}%)
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${burnBarColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>${client.rate}/h</span>
        <span>Est. ${(client.hoursUsedThisMonth * client.rate).toFixed(0)} billed</span>
      </div>
    </div>
  );
}
