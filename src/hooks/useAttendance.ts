import { useQuery } from "@tanstack/react-query";

import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface AttendanceListItem {
  id: number;
  date: string;
  present: boolean;
  student: {
    name: string;
    surname: string;
    class: { name: string };
  };
  lesson: {
    name: string;
    subject: { name: string };
    class: { name: string };
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
  limit?: number;
}

const buildCacheKey = (params: QueryParams): string => {
  return `attendance:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    classId: params.classId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchAttendance = async (
  params: QueryParams = {},
): Promise<ApiResponse<AttendanceListItem>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.classId !== undefined) {
    searchParams.set("classId", params.classId.toString());
  }
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/attendances?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch attendance");
    }

    const data: ApiResponse<AttendanceListItem> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<AttendanceListItem>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<AttendanceListItem>>(
        cacheKey,
      );
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error
      ? error
      : new Error("Failed to fetch attendance");
  }
};

export const useAttendanceList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: () => fetchAttendance(params),
    staleTime: 5 * 60 * 1000,
  });
};
