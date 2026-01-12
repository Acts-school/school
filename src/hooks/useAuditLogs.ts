import { useQuery } from "@tanstack/react-query";

export interface AuditLogRow {
  id: number;
  actorUserId: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string | null;
  createdAt: string | Date;
}

export const useAuditLogs = (params: { entity: string; entityId: string | undefined; page?: number; limit?: number }) => {
  const sp = new URLSearchParams();
  sp.set("entity", params.entity);
  if (params.entityId) sp.set("entityId", params.entityId);
  if (typeof params.page === "number") sp.set("page", String(params.page));
  if (typeof params.limit === "number") sp.set("limit", String(params.limit));

  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: async (): Promise<{ data: AuditLogRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
      const resp = await fetch(`/api/audit-logs?${sp.toString()}`);
      if (!resp.ok) throw new Error("Failed to fetch audit logs");
      return resp.json();
    },
    enabled: Boolean(params.entityId),
    staleTime: 60_000,
  });
};
