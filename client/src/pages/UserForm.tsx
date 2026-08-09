import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "core/schemas/users";
import { Role } from "core/constants/role.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ErrorAlert from "@/components/ErrorAlert";
import ErrorMessage from "@/components/ErrorMessage";

interface UserData {
  id: string;
  name: string;
  email: string;
  role?: Role;
}

interface UserFormProps {
  user?: UserData;
  onSuccess: () => void;
}

export default function UserForm({ user, onSuccess }: UserFormProps) {
  const isEdit = !!user;
  const queryClient = useQueryClient();

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? Role.agent,
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: CreateUserInput | UpdateUserInput) => {
      if (isEdit) {
        const { data } = await axios.put(`/api/users/${user.id}`, payload);
        return data.user;
      }
      const { data } = await axios.post("/api/users", payload);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      form.reset();
      mutation.reset();
      onSuccess();
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4 font-sans"
      autoComplete="off"
    >
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
        <Input
          id="name"
          placeholder="Full name"
          className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px] h-9"
          aria-invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <ErrorMessage message={form.formState.errors.name.message} />
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          autoComplete="off"
          className="rounded-sm border border-border bg-background focus-visible:ring-primary shadow-none text-[13px] h-9"
          aria-invalid={!!form.formState.errors.email}
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <ErrorMessage message={form.formState.errors.email.message} />
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Role</Label>
        <select
          id="role"
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-none"
          {...form.register("role")}
        >
          <option value={Role.agent}>Agent</option>
          <option value={Role.admin}>Admin</option>
        </select>
      </div>

      {mutation.error && (
        <ErrorAlert
          error={mutation.error}
          fallback={`Failed to ${isEdit ? "update" : "create"} user`}
        />
      )}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all active:scale-98 cursor-pointer shadow-none px-4 py-2"
        >
          {isEdit
            ? mutation.isPending ? "Saving..." : "Save Changes"
            : mutation.isPending ? "Inviting..." : "Send Invite"}
        </Button>
      </div>
    </form>
  );
}
