import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface LessonListItem {
  id: number;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: { name: string };
  class: { name: string };
  teacher: { name: string; surname: string };
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
  return `lessons:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    classId: params.classId ?? null,
    teacherId: params.teacherId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchLessons = async (
  params: QueryParams = {},
): Promise<ApiResponse<LessonListItem>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.classId) searchParams.set("classId", params.classId.toString());
  if (params.teacherId) searchParams.set("teacherId", params.teacherId);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/lessons?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch lessons");
    }

    const data: ApiResponse<LessonListItem> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<LessonListItem>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<LessonListItem>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error
      ? error
      : new Error("Failed to fetch lessons");
  }
};

export const useLessonsList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["lessons", params],
    queryFn: () => fetchLessons(params),
    staleTime: 5 * 60 * 1000,
  });
};

const deleteLesson = async (id: string | number): Promise<void> => {
  const response = await fetch(`/api/lesson?id=${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete lesson");
  }
};

export const useDeleteLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lesson deleted successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast.error(message);
    },
  });
};
