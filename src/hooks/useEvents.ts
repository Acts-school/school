import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

export interface EventListItem {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
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
  return `events:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchEvents = async (params: QueryParams = {}): Promise<ApiResponse<EventListItem>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/events?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const data: ApiResponse<EventListItem> = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<ApiResponse<EventListItem>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<ApiResponse<EventListItem>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error("Failed to fetch events");
  }
};

export const useEventsList = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => fetchEvents(params),
    staleTime: 5 * 60 * 1000,
  });
};

const deleteEvent = async (id: string | number): Promise<void> => {
  const response = await fetch(`/api/event?id=${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete event");
  }
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast.error(message);
    },
  });
};
