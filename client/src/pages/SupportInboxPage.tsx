import { useState, useEffect } from "react";
import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Mail, Send, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

export default function SupportInboxPage() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useActiveWorkspace();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // 1. Sync Status Query with polling
  const { data: syncState } = useQuery<any>({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const { data } = await axios.get("/api/tickets/sync-status");
      return data;
    },
    refetchInterval: (query) => {
      // Poll every 1.5 seconds if sync is running, else stop polling
      return query.state.data?.isSyncing ? 1500 : false;
    }
  });

  // 2. Trigger Sync Mutation
  const triggerSyncMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/tickets/sync");
      return data;
    },
    onMutate: () => {
      // Optimistically set syncing state to true
      queryClient.setQueryData(["sync-status"], (old: any) => ({ ...old, isSyncing: true }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    }
  });

  // 3. Auto-sync on Mount (2-minute cooldown)
  useEffect(() => {
    if (syncState && !syncState.isSyncing) {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const lastSyncTimeMs = syncState.lastSyncTime ? new Date(syncState.lastSyncTime).getTime() : 0;
      if (lastSyncTimeMs < twoMinutesAgo) {
        triggerSyncMutation.mutate();
      }
    }
  }, [syncState?.lastSyncTime]);

  // 4. Invalidate tickets cache when sync finishes successfully
  useEffect(() => {
    if (syncState && !syncState.isSyncing && syncState.lastSyncStatus === "success") {
      queryClient.invalidateQueries({ queryKey: ["tickets", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["unread-inbox-count", activeWorkspaceId] });
    }
  }, [syncState?.isSyncing, syncState?.lastSyncStatus, activeWorkspaceId]);

  const { data: ticketsData = { tickets: [] } } = useQuery<any>({
    queryKey: ["tickets", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return { tickets: [] };
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/tickets?status=new&pageSize=100`);
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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "refund_request":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium bg-[#fdebec] text-[#9f2f2d] border border-[#eaeaea]">Refund</span>;
      case "technical_question":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium bg-[#fbf3db] text-[#956400] border border-[#eaeaea]">Technical</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium bg-[#edf3ec] text-[#346538] border border-[#eaeaea]">General</span>;
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="text-muted-foreground text-[13px] p-6 font-sans">
        Select a workspace to view the Support Inbox.
      </div>
    );
  }

  // Format last sync time string
  const getLastSyncText = () => {
    if (!syncState?.lastSyncTime) return "";
    const date = new Date(syncState.lastSyncTime);
    return `Synced at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <div className="space-y-6 h-full flex flex-col font-sans">
      <div className="flex justify-between items-end shrink-0 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-4xl font-light tracking-tight text-foreground leading-none">Support Inbox</h1>
              
              {/* Sync status indicator */}
              {syncState?.isSyncing && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                  <RefreshCw size={10} className="animate-spin" /> Syncing Gmail...
                </span>
              )}
              {!syncState?.isSyncing && syncState?.lastSyncStatus === "error" && (
                <span 
                  title={syncState?.lastSyncError || "Unknown error occurred"}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-full cursor-help"
                >
                  <AlertCircle size={10} /> Sync Failed
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground mt-2">
              Review incoming support emails and send drafts {syncState?.lastSyncTime && `• ${getLastSyncText()}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Sync Inbox Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerSyncMutation.mutate()}
            disabled={syncState?.isSyncing}
            className="gap-1.5 cursor-pointer rounded-sm border border-border text-xs h-8 bg-card hover:bg-muted/30"
          >
            <RefreshCw size={12} className={syncState?.isSyncing ? "animate-spin" : ""} />
            {syncState?.isSyncing ? "Checking..." : "Sync Inbox"}
          </Button>

          <Button size="sm" onClick={() => simulateEmailMutation.mutate()} disabled={simulateEmailMutation.isPending} className="gap-1.5 cursor-pointer rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8">
            <Mail size={13} /> Simulate Inbound Email
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
        {/* Left List */}
        <div className="border border-border rounded-md bg-card flex flex-col overflow-hidden max-h-[650px]">
          <div className="p-4 border-b border-border bg-muted/20 shrink-0">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Unresolved Support Queue ({inboxTickets.length})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {inboxTickets.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground text-xs">
                No new support emails. Queue is clear!
              </div>
            ) : (
              inboxTickets.map((t: any) => {
                const initials = t.senderName
                  ? t.senderName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  : t.senderEmail.slice(0, 2).toUpperCase();

                const isSelected = selectedTicketId === String(t.id);

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(String(t.id))}
                    className={`p-4 border rounded-md cursor-pointer transition-all duration-200 flex items-start hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                      isSelected
                        ? "border-primary bg-muted/30"
                        : "border-border bg-card hover:bg-muted/10"
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-mono font-medium text-muted-foreground mr-3 shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-xs font-semibold truncate ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                          {t.subject}
                        </h4>
                        <div className="shrink-0">{getCategoryBadge(t.category)}</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {t.body || t.subject}
                      </p>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-2.5 font-mono">
                        <span className="truncate max-w-[120px]">From: {t.senderName || t.senderEmail}</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="border border-border rounded-md bg-card flex flex-col overflow-hidden max-h-[650px]">
          {selectedTicket ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border flex justify-between items-start shrink-0 bg-muted/10">
                <div>
                  <h3 className="font-semibold text-[14px] text-foreground leading-tight">{selectedTicket.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    From: <span className="font-semibold text-foreground/80">{selectedTicket.senderName}</span> &lt;{selectedTicket.senderEmail}&gt;
                  </p>
                </div>
                <div className="shrink-0">{getCategoryBadge(selectedTicket.category)}</div>
              </div>

              {/* Message Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="p-4 bg-muted/40 border border-border rounded-sm text-xs text-foreground whitespace-pre-wrap leading-relaxed max-w-[75ch] font-sans">
                  {selectedTicket.body || "No email body provided."}
                </div>
              </div>

              {/* Reply Box */}
              <div className="border-t border-border p-4 bg-muted/10 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono text-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-primary" />
                    AI Assistant Draft
                  </h4>
                  {suggestedArticle && (
                    <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm">
                      KB MATCH: {suggestedArticle.title}
                    </span>
                  )}
                </div>
                <textarea
                  className="w-full min-h-[140px] text-xs p-3 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans leading-relaxed"
                  placeholder="Draft your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedTicketId(null)} className="h-8 text-xs cursor-pointer rounded-sm border border-border bg-muted hover:bg-muted/80">
                    Close
                  </Button>
                  <Button size="sm" className="gap-1.5 cursor-pointer rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8" onClick={() => replyMutation.mutate({ id: selectedTicket.id, text: replyText })} disabled={!replyText || replyMutation.isPending}>
                    <Send size={11} /> Send & Archive
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs py-24 font-sans">
              <Mail className="h-8 w-8 text-muted-foreground/30 mb-2" />
              Select an email from the queue to view details and draft replies.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
