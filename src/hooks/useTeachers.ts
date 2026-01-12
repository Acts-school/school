import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getOfflineCache, setOfflineCache } from '@/lib/offlineCache';

// Types
interface Teacher {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  address: string;
  img?: string;
  subjects: { name: string }[];
  classes: { name: string }[];
  _count: {
    subjects: number;
    lessons: number;
    classes: number;
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
  classId?: string;
  limit?: number;
}

// API functions
const buildCacheKey = (params: QueryParams): string => {
  return `teachers:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    classId: params.classId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchTeachers = async (params: QueryParams = {}): Promise<ApiResponse<Teacher>> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.classId) searchParams.set('classId', params.classId);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/teachers?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch teachers');
    }
    
    const data: ApiResponse<Teacher> = await response.json();

    if (typeof window !== 'undefined') {
      void setOfflineCache<ApiResponse<Teacher>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== 'undefined') {
      const cached = await getOfflineCache<ApiResponse<Teacher>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error('Failed to fetch teachers');
  }
};

const createTeacher = async (teacher: Partial<Teacher>): Promise<Teacher> => {
  const response = await fetch('/api/teachers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teacher),
  });

  if (!response.ok) {
    throw new Error('Failed to create teacher');
  }

  return response.json();
};

const updateTeacher = async ({ id, ...teacher }: Partial<Teacher> & { id: string }): Promise<Teacher> => {
  const response = await fetch(`/api/teachers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teacher),
  });

  if (!response.ok) {
    throw new Error('Failed to update teacher');
  }

  return response.json();
};

const deleteTeacher = async (id: string): Promise<void> => {
  const response = await fetch(`/api/teachers?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete teacher');
  }
};

// Custom Hooks
export const useTeachers = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ['teachers', params],
    queryFn: () => fetchTeachers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      // Cache ni yangilash
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher created successfully');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast.error(message || 'An error occurred');
    },
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTeacher,
    onSuccess: (data, variables) => {
      // Cache ni yangilash
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      // Bitta teacher cache ni ham yangilash
      queryClient.setQueryData(['teacher', variables.id], data);
      toast.success('Teacher updated successfully');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast.error(message || 'An error occurred');
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      // Cache ni yangilash
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher deleted successfully');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast.error(message || 'An error occurred');
    },
  });
};