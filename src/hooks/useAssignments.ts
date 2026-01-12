import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface AssignmentListItem {
  id: number;
  title: string;
  startDate: string;
  dueDate: string;
  lesson: {
    subject: { name: string };
    class: { name: string };
    teacher: { name: string; surname: string };
  };
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
  classId?: number;
  teacherId?: string;
  limit?: number;
}

const buildCacheKey = (params: QueryParams): string => {
  return `assignments:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    classId: params.classId ?? null,
    teacherId: params.teacherId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchAssignments = async (
  params: QueryParams = {},
): Promise<ApiResponse<AssignmentListItem>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.classId !== undefined) {
    searchParams.set("classId", params.classId.toString());
  }
  if (params.teacherId) searchParams.set("teacherId", params.teacherId);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/assignments?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch assignments");
    }

    const data: ApiResponse<AssignmentListItem> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<AssignmentListItem>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<AssignmentListItem>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error
      ? error
      : new Error("Failed to fetch assignments");
  }
};

export const useAssignmentsList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["assignments", params],
    queryFn: () => fetchAssignments(params),
    staleTime: 5 * 60 * 1000,
  });
};

const deleteAssignment = async (id: string | number): Promise<void> => {
  const response = await fetch(`/api/assignment?id=${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete assignment");
  }
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment deleted successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast.error(message);
    },
  });
};
