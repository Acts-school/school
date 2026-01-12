import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Term = "TERM1" | "TERM2" | "TERM3";

export interface ClassFeeStructureRow {
  id: number;
  classId: number;
  feeCategoryId: number;
  term: Term | null;
  academicYear: number | null;
  amount: number; // minor units
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  feeCategory?: { id: number; name: string };
}

export const useClassFeeStructures = (params: { classId?: number; year?: number }) => {
  const query = new URLSearchParams();
  if (typeof params.classId === "number") query.set("classId", String(params.classId));
  if (typeof params.year === "number") query.set("year", String(params.year));

  return useQuery({
    queryKey: ["class-fee-structures", params],
    queryFn: async (): Promise<{ data: ClassFeeStructureRow[] }> => {
      const resp = await fetch(`/api/fee-structures${query.toString() ? `?${query.toString()}` : ""}`);
      if (!resp.ok) throw new Error("Failed to fetch class fee structures");
      return resp.json();
    },
    enabled: typeof params.classId === "number" && typeof params.year === "number",
    staleTime: 5 * 60 * 1000,
  });
};

export interface UpsertLineInput {
  feeCategoryId: number;
  term: Term | null;
  amountMinor: number;
  active?: boolean;
}

export const useUpsertClassFeeStructures = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { classId: number; year: number; lines: UpsertLineInput[] }) => {
      const resp = await fetch("/api/fee-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Failed to upsert class fee structures");
      return resp.json() as Promise<{ data: ClassFeeStructureRow[] }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class-fee-structures", { classId: variables.classId, year: variables.year }] });
    },
  });
};

export interface PreviewPayload { classId: number; year: number; scope?: "all" | "term"; term?: Term }
export interface PreviewLine { studentId: string; feeCategoryId: number; term: Term | null; academicYear: number; amount: number; sourceStructureId: number }

export const usePreviewFeeApply = () => {
  return useMutation({
    mutationFn: async (payload: PreviewPayload) => {
      const resp = await fetch("/api/fee-structures/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error("Failed to preview");
      return resp.json() as Promise<{ data: PreviewLine[]; count: number }>;
    },
  });
};

export interface ApplyPayload extends PreviewPayload { reason?: string }

export const useApplyFee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApplyPayload) => {
      const resp = await fetch("/api/fee-structures/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error("Failed to apply");
      return resp.json() as Promise<{ ok: true }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};
