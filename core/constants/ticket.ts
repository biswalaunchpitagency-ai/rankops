import { type TicketStatus } from "./ticket-status";
import { type TicketCategory } from "./ticket-category";

export interface Ticket {
  id: number;
  subject: string;
  body: string;
  bodyHtml: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  senderName: string;
  senderEmail: string;
  assignedTo: { id: string; name: string } | null;
  workspaceId: string;
  clientId: string | null;
  impact: string | null;
  checklist: any;
  createdAt: string;
  updatedAt: string;
}
