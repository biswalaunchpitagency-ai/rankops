import { type TicketStatus, statusLabel } from "core/constants/ticket-status.ts";

const statusStyles: Record<TicketStatus, string> = {
  new: "bg-[#fdebec] text-[#9f2f2d] dark:bg-[#9f2f2d]/25 dark:text-[#fdebec]",
  processing: "bg-[#fbf3db] text-[#956400] dark:bg-[#956400]/25 dark:text-[#fbf3db]",
  open: "bg-[#fbf3db] text-[#956400] dark:bg-[#956400]/25 dark:text-[#fbf3db]",
  resolved: "bg-[#edf3ec] text-[#346538] dark:bg-[#346538]/25 dark:text-[#edf3ec]",
  closed: "bg-[#edf3ec] text-[#346538] dark:bg-[#346538]/25 dark:text-[#edf3ec]",
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium border-transparent ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}
