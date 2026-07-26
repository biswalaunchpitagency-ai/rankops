import DOMPurify from "dompurify";
import { type Ticket } from "core/constants/ticket.ts";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";

interface TicketDetailProps {
  ticket: Ticket;
}

export default function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          <h1 className="font-display text-4xl font-normal tracking-tight text-foreground flex-1 leading-none">
            {ticket.subject}
          </h1>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted-foreground border-b border-border pb-4">
          <div>
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">From:</span>{" "}
            <span className="font-medium text-foreground">{ticket.senderName}</span> ({ticket.senderEmail})
          </div>
          <div>
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Created:</span>{" "}
            <span className="font-mono">{new Date(ticket.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Updated:</span>{" "}
            <span className="font-mono">{new Date(ticket.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <Card className="border border-border rounded-sm shadow-none bg-card">
        <CardContent className="pt-6 text-[14px] leading-relaxed text-foreground">
          {ticket.bodyHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(ticket.bodyHtml),
              }}
            />
          ) : (
            <p className="whitespace-pre-wrap">
              {ticket.body}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
