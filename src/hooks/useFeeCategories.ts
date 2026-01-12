import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

export interface FeeCategory {
  id: number;
  name: string;
  active: boolean;
  frequency: "TERMLY" | "YEARLY" | "ONE_TIME";
}

interface FeeCategoriesResponse {
  data: FeeCategory[];
}

export interface CreateFeeCategoryInput {
  name: string;
  description?: string;
  frequency: "TERMLY" | "YEARLY" | "ONE_TIME";
}

export interface UpdateFeeCategoryInput {
  id: number;
  name?: string;
  active?: boolean;
}

export const useFeeCategories = (activeOnly = true) => {
  return useQuery({
    queryKey: ["fee-categories", { activeOnly }],
    queryFn: async (): Promise<FeeCategoriesResponse> => {
      const resp = await fetch(`/api/fee-categories${activeOnly ? "?active=true" : ""}`);
      if (!resp.ok) throw new Error("Failed to fetch fee categories");
      const json = (await resp.json()) as FeeCategoriesResponse;
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });
};

const createFeeCategory = async (input: CreateFeeCategoryInput): Promise<FeeCategory> => {
  const response = await fetch("/api/fee-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create fee category");
  }

  const created = (await response.json()) as FeeCategory;
  return created;
};

const updateFeeCategory = async (input: UpdateFeeCategoryInput): Promise<FeeCategory> => {
  const response = await fetch("/api/fee-categories", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const rawBody: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = rawBody as { error?: string } | null;
    const message = typeof body?.error === "string" ? body.error : "Failed to update fee category";
    throw new Error(message);
  }

  const updated = rawBody as FeeCategory;
  return updated;
};

export const useCreateFeeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFeeCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-categories"] });
      toast.success("Fee category created");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useUpdateFeeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFeeCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-categories"] });
      toast.success("Fee category updated");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};
