import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface ResultListItem {
  id: number;
  title: string;
  studentName: string;
  studentSurname: string;
  teacherName: string;
  teacherSurname: string;
  score: number;
  className: string;
  startTime: string;
  isBelowPassing: boolean;
}

interface ApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface QueryParams {
  page?: number;
  search?: string;
  studentId?: string;
  limit?: number;
}

const buildCacheKey = (params: QueryParams): string => {
  return `results:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    studentId: params.studentId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchResults = async (
  params: QueryParams = {},
): Promise<ApiResponse<ResultListItem>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.studentId) searchParams.set("studentId", params.studentId);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/results?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch results");
    }

    const data: ApiResponse<ResultListItem> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<ResultListItem>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<ResultListItem>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error
      ? error
      : new Error("Failed to fetch results");
  }
};

export const useResultsList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["results", params],
    queryFn: () => fetchResults(params),
    staleTime: 5 * 60 * 1000,
  });
};

const deleteResult = async (id: string | number): Promise<void> => {
  const response = await fetch(`/api/result?id=${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete result");
  }
};

export const useDeleteResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      toast.success("Result deleted successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast.error(message);
    },
  });
};
