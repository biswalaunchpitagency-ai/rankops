import { useState, useEffect } from "react";
import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Sparkles } from "lucide-react";

export default function SupportInboxPage() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useActiveWorkspace();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: ticketsData = { tickets: [] } } = useQuery<any>({
    queryKey: ["tickets", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return { tickets: [] };
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/tickets`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  const { data: kbArticles = [] } = useQuery<any[]>({
    queryKey: ["kb", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/kb`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  // Filter email source tickets that are "new"
  const inboxTickets = (ticketsData.tickets || []).filter(
    (t: any) => t.status === "new"
  );

  const simulateEmailMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/workspaces/${activeWorkspaceId}/tickets/simulate-email`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["unread-inbox-count", activeWorkspaceId] });
    }
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      await axios.post(`/api/tickets/${id}/replies`, { body: text });
      // Update ticket status to open
      await axios.patch(`/api/tickets/${id}`, { status: "open" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["unread-inbox-count", activeWorkspaceId] });
      setReplyText("");
      setSelectedTicketId(null);
    }
  });

  const selectedTicket = inboxTickets.find((t: any) => String(t.id) === String(selectedTicketId));

  // Find suggestion based on keywords
  const getSuggestion = (ticket: any) => {
    if (!ticket) return null;
    const textToMatch = `${ticket.subject} ${ticket.body}`.toLowerCase();
    const matchedArticle = kbArticles.find((art) => {
      const keywords = (art.keywords || "").split(",").map((k: string) => k.trim().toLowerCase());
      return keywords.some((kw: string) => kw && textToMatch.includes(kw));
    });
    return matchedArticle;
  };

  const suggestedArticle = selectedTicket ? getSuggestion(selectedTicket) : null;

  // Auto-populate draft if suggested article changes
  useEffect(() => {
    if (selectedTicket && suggestedArticle) {
      setReplyText(
        `Hi ${selectedTicket.senderName || "there"},\n\n${suggestedArticle.content}\n\nBest regards,\nLaunchpit Agency Team`
      );
    } else {
      setReplyText("");
    }
  }, [selectedTicket, suggestedArticle]);

  if (!activeWorkspaceId) {
    return (
      <div className="text-muted-foreground text-[13px] p-6">
        Select a workspace to view the Support Inbox.
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">Support Inbox</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Review incoming support emails and send drafts</p>
        </div>
        <Button size="sm" onClick={() => simulateEmailMutation.mutate()} disabled={simulateEmailMutation.isPending} className="gap-1.5 cursor-pointer">
          <Mail size={14} /> Simulate Inbound Email
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px]">
        {/* Left List */}
        <div className="border border-border rounded-sm bg-card overflow-y-auto p-4 space-y-3">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Unresolved Support Queue ({inboxTickets.length})</h3>
          
          {inboxTickets.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-[13px]">
              No new support emails. Queue is clear!
            </div>
          ) : (
            inboxTickets.map((t: any) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(String(t.id))}
                className={`p-4 border rounded-sm cursor-pointer transition-all hover:bg-secondary/15 ${
                  selectedTicketId === String(t.id) ? "border-primary bg-secondary/10" : "border-border"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-semibold text-sm line-clamp-1">{t.subject}</h4>
                  <Badge variant="outline" className="capitalize text-[10px] shrink-0">{t.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body || t.subject}</p>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-mono">
                  <span>From: {t.senderName || t.senderEmail}</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Detail Pane */}
        <div className="border border-border rounded-sm bg-card p-4 flex flex-col justify-between">
          {selectedTicket ? (
            <div className="flex flex-col h-full justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <h3 className="font-semibold text-base">{selectedTicket.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">From: {selectedTicket.senderName} ({selectedTicket.senderEmail})</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{selectedTicket.category.replace("_", " ")}</Badge>
                </div>
                <div className="p-3 bg-secondary/20 rounded-sm text-xs text-foreground whitespace-pre-wrap min-h-[120px]">
                  {selectedTicket.body || "No email body provided."}
                </div>
              </div>

              {/* Reply Box */}
              <div className="border-t border-border pt-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold flex items-center gap-1">
                    <Sparkles size={12} className="text-primary animate-pulse" />
                    AI Assistant Draft Reply
                  </h4>
                  {suggestedArticle && (
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Matched KB: {suggestedArticle.title}
                    </span>
                  )}
                </div>
                <textarea
                  className="w-full min-h-[120px] text-xs p-3 border border-border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Draft your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTicketId(null)}>Close</Button>
                  <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => replyMutation.mutate({ id: selectedTicket.id, text: replyText })} disabled={!replyText || replyMutation.isPending}>
                    <Send size={12} /> Send & Archive
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs py-20">
              Select an email from the left to view details and draft replies.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
