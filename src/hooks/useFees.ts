import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface FeeStructureRow {
  id: number;
  name: string;
  description: string | null;
  amount: number; // minor units (KES * 100)
  active: boolean;
  class: { id: number; name: string } | null;
  _count: { studentFees: number };
}

interface FeesApiResponse {
  data: FeeStructureRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FeeQueryParams {
  page?: number;
  search?: string;
  classId?: string;
  limit?: number;
}

export interface CreateFeeInput {
  name: string;
  description?: string;
  amount: number; // KES, not minor units
  classId?: number;
}

const buildSearchParams = (params: FeeQueryParams): string => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.classId) searchParams.set("classId", params.classId);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  return searchParams.toString();
};

const buildCacheKey = (params: FeeQueryParams): string => {
  return `fees:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    classId: params.classId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchFees = async (params: FeeQueryParams = {}): Promise<FeesApiResponse> => {
  const query = buildSearchParams(params);
  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/fees${query ? `?${query}` : ""}`);

    if (!response.ok) {
      throw new Error("Failed to fetch fees");
    }

    const data: FeesApiResponse = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<FeesApiResponse>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<FeesApiResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error("Failed to fetch fees");
  }
};

const createFee = async (input: CreateFeeInput): Promise<FeeStructureRow> => {
  const response = await fetch("/api/fees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create fee");
  }

  const created: FeeStructureRow = await response.json();
  return created;
};

export const useFees = (params: FeeQueryParams = {}) => {
  return useQuery({
    queryKey: ["fees", params],
    queryFn: () => fetchFees(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateFee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success("Fee created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};
