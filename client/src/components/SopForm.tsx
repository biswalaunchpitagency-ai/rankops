import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSopSchema, type CreateSopInput } from "core/schemas/sops.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ErrorAlert from "@/components/ErrorAlert";
import type { UseMutationResult } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mutation: UseMutationResult<any, Error, CreateSopInput>;
}

export default function SopForm({ open, onOpenChange, mutation }: Props) {
  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<CreateSopInput>({
    resolver: zodResolver(createSopSchema) as any,
    defaultValues: {
      title: "",
      category: "",
      tools: "",
      steps: [{ text: "", position: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "steps",
  });

  const onSubmit = (data: CreateSopInput) => {
    // Assign position order to steps
    const formattedSteps = data.steps.map((step, idx) => ({
      text: step.text,
      position: idx,
    }));
    mutation.mutate({
      ...data,
      steps: formattedSteps,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg rounded-md border border-border bg-background max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">Add SOP Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Title *</Label>
            <Input {...register("title")} placeholder="e.g. Initial Website Setup" className="rounded-sm bg-background border-border" />
            {errors.title && <p className="text-[11px] text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Category *</Label>
              <Input {...register("category")} placeholder="e.g. Technical, Content" className="rounded-sm bg-background border-border" />
              {errors.category && <p className="text-[11px] text-destructive">{errors.category.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Tools Used</Label>
              <Input {...register("tools")} placeholder="e.g. Screaming Frog, Ahrefs" className="rounded-sm bg-background border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Steps *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ text: "", position: fields.length })}
                className="h-7 text-[11px] rounded-sm gap-1 border-border"
              >
                <Plus className="h-3 w-3" /> Add Step
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground w-6 text-right mt-2.5">{idx + 1}.</span>
                  <div className="flex-1">
                    <Input
                      {...register(`steps.${idx}.text` as const)}
                      placeholder={`Step ${idx + 1} description`}
                      className="rounded-sm bg-background border-border"
                    />
                    {errors.steps?.[idx]?.text && (
                      <p className="text-[11px] text-destructive mt-0.5">{errors.steps[idx]?.text?.message}</p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(idx)}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive border-border"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <ErrorAlert error={mutation.error} fallback="Failed to save SOP" />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm border-border hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-sm">
              {mutation.isPending ? "Creating…" : "Save SOP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
