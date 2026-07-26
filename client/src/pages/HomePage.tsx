import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorAlert from "@/components/ErrorAlert";
import StatusBadge from "@/components/StatusBadge";
import { type TicketStatus } from "core/constants/ticket-status.ts";
import { type TicketCategory, categoryLabel } from "core/constants/ticket-category.ts";
import {
  TicketIcon,
  CircleDot,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";

interface Stats {
  totalTickets: number;
  openTickets: number;
  resolvedByAI: number;
  aiResolutionRate: number;
  avgResolutionTime: number;
  recentTickets: {
    id: number;
    subject: string;
    status: string;
    category: string;
    senderName: string;
    createdAt: string;
  }[];
  categories: {
    category: string;
    count: number;
  }[];
}

interface DailyVolume {
  data: { date: string; tickets: number }[];
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "N/A";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const chartConfig = {
  tickets: {
    label: "Tickets",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export default function HomePage() {
  const navigate = useNavigate();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<Stats>({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      const res = await axios.get("/api/tickets/stats");
      return res.data;
    },
  });

  const {
    data: volume,
    isLoading: volumeLoading,
    error: volumeError,
  } = useQuery<DailyVolume>({
    queryKey: ["ticket-daily-volume"],
    queryFn: async () => {
      const res = await axios.get("/api/tickets/stats/daily-volume");
      return res.data;
    },
  });

  if (statsError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          Dashboard
        </h1>
        <ErrorAlert
          error={statsError}
          fallback="Failed to load dashboard stats"
        />
      </div>
    );
  }

  const cards = [
    { title: "Total Tickets", value: stats?.totalTickets, icon: TicketIcon, link: "/tickets" },
    { title: "Open Tickets", value: stats?.openTickets, icon: CircleDot, link: "/tickets?status=open" },
    { title: "Resolved by AI", value: stats?.resolvedByAI, icon: Sparkles, link: "/tickets?status=resolved" },
    {
      title: "AI Resolution Rate",
      value: stats ? `${stats.aiResolutionRate}%` : undefined,
      icon: TrendingUp,
    },
    {
      title: "Avg Resolution Time",
      value: stats ? formatDuration(stats.avgResolutionTime) : undefined,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-8 pb-12 font-sans animate-in-page">
      <div>
        <h1 className="font-display text-4xl font-light tracking-tight text-foreground">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Overview of support tickets and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const CardContentComponent = (
            <Card className={card.link ? "border border-border rounded-md hover:border-primary/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-muted/10 transition-all duration-200 cursor-pointer h-full shadow-none" : "border border-border rounded-md h-full shadow-none bg-card"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className="h-7 w-7 rounded-sm bg-muted flex items-center justify-center border border-border">
                    <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-light tracking-tight text-foreground">
                    {card.value}
                  </p>
                )}
              </CardContent>
            </Card>
          );

          return card.link ? (
            <Link key={card.title} to={card.link} className="no-underline block h-full">
              {CardContentComponent}
            </Link>
          ) : (
            <div key={card.title} className="h-full">{CardContentComponent}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tickets Per Day Chart */}
        <Card className="lg:col-span-2 border border-border rounded-md shadow-none bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Tickets Per Day</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Last 30 days volume</CardDescription>
          </CardHeader>
          <CardContent>
            {volumeError ? (
              <ErrorAlert
                error={volumeError}
                fallback="Failed to load chart data"
              />
            ) : volumeLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart accessibilityLayer data={volume?.data}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value: string) => {
                      const d = new Date(value + "T00:00:00");
                      return d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value: string) => {
                          const d = new Date(value + "T00:00:00");
                          return d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="tickets"
                    fill="var(--color-tickets)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Tickets by Category */}
        <Card className="border border-border rounded-md shadow-none bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Tickets by Category</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Distribution across support areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : !stats?.categories || stats.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No category data available.</p>
            ) : (
              stats.categories.map((c) => {
                const label = categoryLabel[c.category as TicketCategory] || c.category;
                const percentage = stats.totalTickets > 0 ? Math.round((c.count / stats.totalTickets) * 100) : 0;
                return (
                  <Link
                    key={c.category}
                    to={`/tickets?category=${c.category}`}
                    className="block group hover:bg-muted/30 p-2.5 rounded-md transition-all duration-150 border border-transparent hover:border-border"
                  >
                    <div className="flex items-center justify-between mb-1.5 text-xs font-medium text-foreground">
                      <span className="group-hover:text-primary transition-colors">{label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{c.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border border-border/20">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Active Tickets Section */}
      <Card className="border border-border rounded-md shadow-none bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">Recent Active Tickets</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">The most recently received support requests</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !stats?.recentTickets || stats.recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent active tickets.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="py-2.5 px-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Subject</th>
                    <th className="py-2.5 px-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="py-2.5 px-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="py-2.5 px-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="py-2.5 px-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTickets.map((t) => {
                    const relativeDate = new Date(t.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const categoryName = categoryLabel[t.category as TicketCategory] || t.category || "General";
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/tickets/${t.id}`)}
                      >
                        <td className="py-3 px-4 font-medium text-foreground group-hover:text-primary transition-colors">
                          {t.subject}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-[13px]">{t.senderName}</td>
                        <td className="py-3 px-4 text-muted-foreground text-[13px]">{categoryName}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={t.status as TicketStatus} />
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">{relativeDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
