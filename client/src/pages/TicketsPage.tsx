import { useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { type TicketStatus } from "core/constants/ticket-status.ts";
import { type TicketCategory } from "core/constants/ticket-category.ts";
import TicketsTable from "./TicketsTable";
import TicketsFilters from "./TicketsFilters";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
}

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const filters: TicketFilters = {
    status: (searchParams.get("status") as TicketStatus) || undefined,
    category: (searchParams.get("category") as TicketCategory) || undefined,
    search: searchParams.get("search") || undefined,
  };

  const setFilters = (newFilters: TicketFilters) => {
    const params: Record<string, string> = {};
    if (newFilters.status) params.status = newFilters.status;
    if (newFilters.category) params.category = newFilters.category;
    if (newFilters.search) params.search = newFilters.search;
    setSearchParams(params);
  };

  const syncMutation = useMutation({
    mutationFn: () => axios.post("/api/tickets/sync"),
    onSuccess: () => {
      // Refresh the ticket list after sync completes
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
    <div className="space-y-6 font-sans animate-in-page">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">Tickets</h1>
        <Button
          id="sync-tickets-btn"
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="gap-1.5 text-[13px] h-8 border-border rounded-sm font-medium cursor-pointer"
          title="Pull new emails from Gmail now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing…" : "Sync"}
        </Button>
      </div>
      <TicketsFilters filters={filters} onChange={setFilters} />
      <TicketsTable filters={filters} />
    </div>
  );
}
