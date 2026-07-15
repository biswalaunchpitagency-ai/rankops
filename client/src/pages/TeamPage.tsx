import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TeamPage() {
  const { activeWorkspaceId } = useActiveWorkspace();

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["workspace-members", activeWorkspaceId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/members`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">Team & Agents</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Directory of specialists and assignees in this workspace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((m) => {
          const initials = m.user.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase();
          return (
            <Card key={m.id} className="shadow-none border-border">
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-semibold">{m.user.name}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground font-mono space-y-1">
                <p>Email: {m.user.email}</p>
                <p>Role Type: {m.user.role}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
