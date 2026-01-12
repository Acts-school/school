"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface Parent {
  id: string;
  username: string;
  name: string;
  surname: string;
  email?: string;
  phone: string;
  address: string;
  students: { name: string; surname: string }[];
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
  limit?: number;
}

const buildCacheKey = (params: QueryParams): string => {
  return `parents:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchParents = async (params: QueryParams = {}): Promise<ApiResponse<Parent>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/parents?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch parents");
    }

    const data: ApiResponse<Parent> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<Parent>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<Parent>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error("Failed to fetch parents");
  }
};

export const useParentsList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["parents", params],
    queryFn: () => fetchParents(params),
    staleTime: 5 * 60 * 1000,
  });
};

const deleteParent = async (id: string): Promise<void> => {
  const response = await fetch(`/api/parent?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete parent");
  }
};

export const useDeleteParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteParent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent deleted successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast.error(message);
    },
  });
};
