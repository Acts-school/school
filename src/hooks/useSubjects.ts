import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getOfflineCache, setOfflineCache } from '@/lib/offlineCache';

// Types
interface Subject {
  id: number;
  name: string;
  teachers: { name: string; surname: string }[];
  _count: {
    teachers: number;
    lessons: number;
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
  limit?: number;
}

// API functions
const buildCacheKey = (params: QueryParams): string => {
  return `subjects:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchSubjects = async (params: QueryParams = {}): Promise<ApiResponse<Subject>> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/subjects?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch subjects');
    }

    const data: ApiResponse<Subject> = await response.json();

    if (typeof window !== 'undefined') {
      void setOfflineCache<ApiResponse<Subject>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== 'undefined') {
      const cached = await getOfflineCache<ApiResponse<Subject>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error('Failed to fetch subjects');
  }
};

const createSubject = async (subject: Omit<Subject, 'id'>): Promise<Subject> => {
  const response = await fetch('/api/subjects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subject),
  });

  if (!response.ok) {
    throw new Error('Failed to create subject');
  }

  return response.json();
};

const updateSubject = async ({ id, ...subject }: Partial<Subject> & { id: number }): Promise<Subject> => {
  const response = await fetch(`/api/subjects/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subject),
  });

  if (!response.ok) {
    throw new Error('Failed to update subject');
  }

  return response.json();
};

const deleteSubject = async (id: string): Promise<void> => {
  const response = await fetch(`/api/subjects?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete subject');
  }
};

// Custom Hooks
export const useSubjects = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ['subjects', params],
    queryFn: () => fetchSubjects(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};