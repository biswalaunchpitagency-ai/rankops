import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientSchema, type CreateClientInput } from "core/schemas/clients.ts";
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
  defaultValues?: Partial<CreateClientInput>;
  mutation: UseMutationResult<any, Error, CreateClientInput>;
  title: string;
}

export default function ClientForm({ open, onOpenChange, defaultValues, mutation, title }: Props) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateClientInput & { emailDomainsStr?: string }>({
    resolver: zodResolver(createClientSchema) as any,
    defaultValues: {
      retainerHours: 0,
      rate: 0,
      status: "Active",
      emailDomains: [],
      ...defaultValues,
      emailDomainsStr: defaultValues?.emailDomains?.join(", ") ?? "",
    },
  });

  const onSubmit = (data: any) => {
    const emailDomains = data.emailDomainsStr
      ? data.emailDomainsStr.split(",").map((d: string) => d.trim()).filter(Boolean)
      : [];
    mutation.mutate({
      name: data.name,
      type: data.type || undefined,
      status: data.status,
      retainerHours: Number(data.retainerHours) || 0,
      rate: Number(data.rate) || 0,
      notes: data.notes || undefined,
      emailDomains,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg rounded-md border border-border bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Client Name *</Label>
            <Input {...register("name")} className="rounded-sm bg-background border-border" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Type</Label>
              <Input {...register("type")} placeholder="E-commerce, SaaS…" className="rounded-sm bg-background border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status</Label>
              <select {...register("status")} className="w-full border border-border rounded-sm px-3 py-2 text-[13px] bg-background text-foreground">
                <option value="Active">Active</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Retainer Hours / Month</Label>
              <Input type="number" min={0} step={0.5} {...register("retainerHours", { valueAsNumber: true })} className="rounded-sm bg-background border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Hourly Rate ($)</Label>
              <Input type="number" min={0} step={1} {...register("rate", { valueAsNumber: true })} className="rounded-sm bg-background border-border" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Email Domains (comma-separated)</Label>
            <Input placeholder="acmestore.com, acme.io" className="rounded-sm bg-background border-border" {...register("emailDomainsStr")} />
            <p className="text-[10px] text-muted-foreground">Used to auto-match inbound support emails to this client.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea {...register("notes")} rows={3} className="rounded-sm resize-none bg-background border-border" />
          </div>
          <ErrorAlert error={mutation.error} fallback="Failed to save client" />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm border-border hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-sm">
              {mutation.isPending ? "Saving…" : "Save Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
