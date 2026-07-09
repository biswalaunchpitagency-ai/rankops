import { useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { type Ticket } from "core/constants/ticket.ts";
import { type SenderType, senderTypeLabel } from "core/constants/sender-type.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ErrorAlert from "@/components/ErrorAlert";
import { Bot, User, Check, Trash, Edit, X, Save, AlertCircle } from "lucide-react";

interface Reply {
  id: number;
  body: string;
  bodyHtml: string | null;
  senderType: SenderType;
  user: { id: string; name: string } | null;
  createdAt: string;
  isDraft: boolean;
}

interface ReplyThreadProps {
  ticket: Ticket;
}

export default function ReplyThread({ ticket }: ReplyThreadProps) {
  const { id: ticketId, senderName } = ticket;
  const queryClient = useQueryClient();
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["replies", ticketId],
    queryFn: async () => {
      const { data } = await axios.get<{ replies: Reply[] }>(
        `/api/tickets/${ticketId}/replies`
      );
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (replyId: number) => {
      await axios.post(`/api/tickets/${ticketId}/replies/${replyId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", String(ticketId)] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (replyId: number) => {
      await axios.delete(`/api/tickets/${ticketId}/replies/${replyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies", ticketId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ replyId, body }: { replyId: number; body: string }) => {
      await axios.patch(`/api/tickets/${ticketId}/replies/${replyId}`, { body });
    },
    onSuccess: () => {
      setEditingReplyId(null);
      queryClient.invalidateQueries({ queryKey: ["replies", ticketId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert error={error} fallback="Failed to load replies" />;
  }

  if (!data?.replies.length) {
    return <p className="text-sm text-muted-foreground">No replies yet</p>;
  }

  const startEditing = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditBody(reply.body);
  };

  return (
    <div className="space-y-3">
      {data.replies.map((reply) => {
        const isAgent = reply.senderType === "agent";
        const displayName = isAgent
          ? reply.user?.name ?? "AI Agent (Draft)"
          : senderName;
        const isEditing = editingReplyId === reply.id;

        return (
          <Card
            key={reply.id}
            className={`transition-all duration-200 ${
              reply.isDraft
                ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm"
                : isAgent
                ? "border-primary/25"
                : ""
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-6 w-6 rounded-md flex items-center justify-center ${
                      reply.isDraft
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : isAgent
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isAgent ? (
                      <Bot className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {displayName}
                      {reply.isDraft && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          AI Draft (Manual Approval Required)
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {reply.isDraft ? "Draft" : senderTypeLabel[reply.senderType]} &middot;{" "}
                      {new Date(reply.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>

                {/* Draft action buttons */}
                {reply.isDraft && !isEditing && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:text-amber-800"
                      onClick={() => startEditing(reply)}
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(reply.id)}
                    >
                      <Check className="h-3 w-3" />
                      Approve & Send
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(reply.id)}
                    >
                      <Trash className="h-3 w-3" />
                      Discard
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3 pt-1">
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={4}
                    className="w-full text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ replyId: reply.id, body: editBody })}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Draft
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setEditingReplyId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : reply.bodyHtml ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(reply.bodyHtml),
                  }}
                />
              ) : (
                <p className="whitespace-pre-line leading-relaxed text-sm">
                  {reply.body}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
