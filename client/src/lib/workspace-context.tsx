import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

interface WorkspaceContextType {
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(
    localStorage.getItem("activeWorkspaceId") || ""
  );

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data } = await axios.get<Workspace[]>("/api/workspaces");
      return data;
    }
  });

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceIdState(workspaces[0].id);
      localStorage.setItem("activeWorkspaceId", workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem("activeWorkspaceId", id);
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspaceId,
        setActiveWorkspaceId,
        activeWorkspace,
        workspaces,
        isLoading
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useActiveWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useActiveWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
