import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getOfflineCache, setOfflineCache } from '@/lib/offlineCache';

// Types
interface Student {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  img?: string;
  class: { name: string };
  grade: { level: number };
  parent: { name: string; surname: string; phone: string };
  _count: {
    attendances: number;
    results: number;
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
  teacherId?: string;
  limit?: number;
}

// API functions
const buildCacheKey = (params: QueryParams): string => {
  return `students:${JSON.stringify({
    page: params.page ?? null,
    search: params.search ?? null,
    classId: params.classId ?? null,
    teacherId: params.teacherId ?? null,
    limit: params.limit ?? null,
  })}`;
};

const fetchStudents = async (params: QueryParams = {}): Promise<ApiResponse<Student>> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.classId) searchParams.set('classId', params.classId);
  if (params.teacherId) searchParams.set('teacherId', params.teacherId);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const cacheKey = buildCacheKey(params);

  try {
    const response = await fetch(`/api/students?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch students');
    }
    
    const data: ApiResponse<Student> = await response.json();

    if (typeof window !== 'undefined') {
      void setOfflineCache<ApiResponse<Student>>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== 'undefined') {
      const cached = await getOfflineCache<ApiResponse<Student>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error('Failed to fetch students');
  }
};

const createStudent = async (student: Omit<Student, 'id'>): Promise<Student> => {
  const response = await fetch('/api/students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(student),
  });

  if (!response.ok) {
    throw new Error('Failed to create student');
  }

  return response.json();
};

const updateStudent = async ({ id, ...student }: Partial<Student> & { id: string }): Promise<Student> => {
  const response = await fetch(`/api/students/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(student),
  });

  if (!response.ok) {
    throw new Error('Failed to update student');
  }

  return response.json();
};

const deleteStudent = async (id: string): Promise<void> => {
  const response = await fetch(`/api/students?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete student');
  }
};

// Custom Hooks
export const useStudents = (params: QueryParams = {}) => {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => fetchStudents(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};