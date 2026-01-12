import { useQuery } from "@tanstack/react-query";

import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface ExamListItem {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
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

export interface QueryParams {
  page?: number;
  search?: string;
  classId?: number;
  teacherId?: string;
  limit?: number;
}

const buildCacheKey = (params: QueryParams): string => {
  return `exams:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    classId: params.classId ?? null,
    teacherId: params.teacherId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchExams = async (
  params: QueryParams = {},
): Promise<ApiResponse<ExamListItem>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.classId !== undefined)
    searchParams.set("classId", params.classId.toString());
  if (params.teacherId) searchParams.set("teacherId", params.teacherId);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/exams?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch exams");
    }

    const data: ApiResponse<ExamListItem> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<ExamListItem>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<ExamListItem>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error("Failed to fetch exams");
  }
};

export const useExamsList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["exams", params],
    queryFn: () => fetchExams(params),
    staleTime: 5 * 60 * 1000,
  });
};
