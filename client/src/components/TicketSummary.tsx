import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Sparkles } from "lucide-react";
import { type Ticket } from "core/constants/ticket.ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ErrorAlert from "@/components/ErrorAlert";

interface TicketSummaryProps {
  ticket: Ticket;
}

export default function TicketSummary({ ticket }: TicketSummaryProps) {
  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `/api/tickets/${ticket.id}/replies/summarize`
      );
      return data.summary as string;
    },
  });

  return (
    <div className="space-y-3 font-sans">
      <Button
        variant="secondary"
        onClick={() => summarizeMutation.mutate()}
        disabled={summarizeMutation.isPending}
        className="gap-2 rounded-sm border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-all duration-200 active:scale-98 shadow-none cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
        <span className="text-[13px] font-medium">
          {summarizeMutation.isPending ? "Summarizing..." : "Summarize"}
        </span>
      </Button>

      {summarizeMutation.error && (
        <ErrorAlert
          error={summarizeMutation.error}
          fallback="Failed to generate summary"
        />
      )}

      {summarizeMutation.data && (
        <Card className="border-[#edf3ec] bg-[#edf3ec]/20 rounded-sm shadow-none">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-sm bg-[#edf3ec] flex items-center justify-center shrink-0 mt-0.5 border border-[#346538]/10">
                <Sparkles className="h-3.5 w-3.5 text-[#346538]" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#346538]">
                  AI Summary
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#346538]">
                  {summarizeMutation.data}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
