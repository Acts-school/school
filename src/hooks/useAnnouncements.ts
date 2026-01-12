import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface AnnouncementListItem {
  id: number;
  title: string;
  description: string;
  date: string;
  class: { name: string } | null;
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
  return `announcements:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchAnnouncements = async (
  params: QueryParams = {},
): Promise<ApiResponse<AnnouncementListItem>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/announcements?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch announcements");
    }

    const data: ApiResponse<AnnouncementListItem> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<AnnouncementListItem>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<AnnouncementListItem>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error("Failed to fetch announcements");
  }
};

export const useAnnouncementsList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["announcements", params],
    queryFn: () => fetchAnnouncements(params),
    staleTime: 5 * 60 * 1000,
  });
};

const deleteAnnouncement = async (id: number): Promise<void> => {
  const response = await fetch(`/api/announcement?id=${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete announcement");
  }
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast.error(message);
    },
  });
};
