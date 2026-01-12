import { useQuery } from "@tanstack/react-query";

export interface StudentFeeRow {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: { id: number; name: string };
    grade: { id: number; level: number };
  };
  structureId: number | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

interface StudentFeesApiResponse {
  data: StudentFeeRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StudentFeeQueryParams {
  structureId: number;
  page?: number;
  limit?: number;
  search?: string;
}

const buildSearchParams = (params: StudentFeeQueryParams): string => {
  const searchParams = new URLSearchParams();

  searchParams.set("structureId", params.structureId.toString());

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);

  return searchParams.toString();
};

const fetchStudentFees = async (params: StudentFeeQueryParams): Promise<StudentFeesApiResponse> => {
  const query = buildSearchParams(params);
  const response = await fetch(`/api/student-fees?${query}`);

  if (!response.ok) {
    throw new Error("Failed to fetch student fees");
  }

  const data: StudentFeesApiResponse = await response.json();
  return data;
};

export const useStudentFees = (params: StudentFeeQueryParams) => {
  return useQuery({
    queryKey: ["student-fees", params],
    queryFn: () => fetchStudentFees(params),
    staleTime: 5 * 60 * 1000,
  });
};
