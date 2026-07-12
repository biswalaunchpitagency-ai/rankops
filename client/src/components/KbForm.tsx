import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createKbArticleSchema, type CreateKbArticleInput } from "core/schemas/kb.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ErrorAlert from "@/components/ErrorAlert";
import type { UseMutationResult } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mutation: UseMutationResult<any, Error, CreateKbArticleInput>;
}

export default function KbForm({ open, onOpenChange, mutation }: Props) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateKbArticleInput>({
    resolver: zodResolver(createKbArticleSchema) as any,
    defaultValues: {
      title: "",
      category: "",
      keywords: "",
      content: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg rounded-md border border-border bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">Add KB Article</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Title *</Label>
            <Input {...register("title")} placeholder="e.g. Email Settings Configuration" className="rounded-sm bg-background border-border" />
            {errors.title && <p className="text-[11px] text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Category *</Label>
              <Input {...register("category")} placeholder="e.g. Email, Hosting, Domain" className="rounded-sm bg-background border-border" />
              {errors.category && <p className="text-[11px] text-destructive">{errors.category.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Keywords (comma-separated) *</Label>
              <Input {...register("keywords")} placeholder="e.g. imap, smtp, ports" className="rounded-sm bg-background border-border" />
              {errors.keywords && <p className="text-[11px] text-destructive">{errors.keywords.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Content *</Label>
            <Textarea {...register("content")} rows={6} placeholder="Type the article content here..." className="rounded-sm resize-none bg-background border-border" />
            {errors.content && <p className="text-[11px] text-destructive">{errors.content.message}</p>}
          </div>

          <ErrorAlert error={mutation.error} fallback="Failed to save article" />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm border-border hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-sm">
              {mutation.isPending ? "Creating…" : "Save Article"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
