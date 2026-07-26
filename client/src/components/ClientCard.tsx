export interface Client {
  id: string;
  name: string;
  type?: string | null;
  retainerHours: number;
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
  const burnBarColor = pct > 95 ? "bg-[#9f2f2d]" : pct > 75 ? "bg-[#956400]" : "bg-[#346538]";

  const statusColors: Record<string, string> = {
    Active: "bg-[#edf3ec] text-[#346538] border border-[#eaeaea]",
    Onboarding: "bg-[#fbf3db] text-[#956400] border border-[#eaeaea]",
    Paused: "bg-muted text-muted-foreground border border-[#eaeaea]",
  };

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-md p-5 cursor-pointer hover:border-primary/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{client.name}</h3>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm ${statusColors[client.status] ?? "bg-muted text-muted-foreground border border-[#eaeaea]"}`}>
          {client.status}
        </span>
      </div>
      {client.type && <p className="text-xs text-muted-foreground mb-3 font-sans">{client.type}</p>}

      <div className="text-[10px] text-muted-foreground mb-1.5 font-mono uppercase tracking-wider">
        Retainer burn — {client.hoursUsedThisMonth.toFixed(1)} / {client.retainerHours}h ({Math.round(pct)}%)
      </div>
      <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
        <div className={`h-full rounded-sm transition-all duration-300 ${burnBarColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
