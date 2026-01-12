import { useQuery } from "@tanstack/react-query";

export interface MyStudentFeeRow {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: { id: number; name: string };
    grade: { id: number; level: number };
  };
  structure: {
    id: number;
    name: string;
  } | null;
  feeCategory?: {
    id: number;
    name: string;
  } | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

interface MyStudentFeesApiResponse {
  data: MyStudentFeeRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MyStudentFeeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  term?: "TERM1" | "TERM2" | "TERM3";
  year?: number;
  studentId?: string;
}

const buildSearchParams = (params: MyStudentFeeQueryParams): string => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.term) searchParams.set("term", params.term);
  if (typeof params.year === "number") searchParams.set("year", params.year.toString());
  if (params.studentId) searchParams.set("studentId", params.studentId);

  return searchParams.toString();
};

const fetchMyStudentFees = async (
  params: MyStudentFeeQueryParams,
): Promise<MyStudentFeesApiResponse> => {
  const query = buildSearchParams(params);
  const response = await fetch(`/api/student-fees/my?${query}`);

  if (!response.ok) {
    throw new Error("Failed to fetch fees");
  }

  const data: MyStudentFeesApiResponse = await response.json();
  return data;
};

export const useMyStudentFees = (params: MyStudentFeeQueryParams) => {
  return useQuery({
    queryKey: ["my-student-fees", params],
    queryFn: () => fetchMyStudentFees(params),
    staleTime: 5 * 60 * 1000,
  });
};
