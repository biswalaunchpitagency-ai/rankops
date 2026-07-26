import { useSearchParams } from "react-router";
import { type TicketStatus } from "core/constants/ticket-status.ts";
import { type TicketCategory } from "core/constants/ticket-category.ts";
import TicketsTable from "./TicketsTable";
import TicketsFilters from "./TicketsFilters";

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
}

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

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

  return (
    <div className="space-y-6 font-sans animate-in-page">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">Tickets</h1>
      </div>
      <TicketsFilters filters={filters} onChange={setFilters} />
      <TicketsTable filters={filters} />
    </div>
  );
}
