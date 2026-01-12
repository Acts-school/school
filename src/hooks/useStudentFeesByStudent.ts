import { useQuery } from "@tanstack/react-query";
import type { TermLiteral } from "@/lib/schoolSettings";

export interface StudentFeesByStudentItem {
  id: string;
  name: string | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  term: TermLiteral | null;
  academicYear: number | null;
}

interface StudentFeesByStudentResponse {
  data: StudentFeesByStudentItem[];
}

export interface StudentFeesByStudentParams {
  studentId: string;
  term?: TermLiteral;
  year?: number;
}

const buildSearchParams = (params: StudentFeesByStudentParams): string => {
  const searchParams = new URLSearchParams();

  searchParams.set("studentId", params.studentId);
  if (params.term) searchParams.set("term", params.term);
  if (typeof params.year === "number") searchParams.set("year", params.year.toString());

  return searchParams.toString();
};

const fetchStudentFeesByStudent = async (
  params: StudentFeesByStudentParams,
): Promise<StudentFeesByStudentResponse> => {
  const query = buildSearchParams(params);
  const response = await fetch(`/api/student-fees/by-student?${query}`);

  if (!response.ok) {
    throw new Error("Failed to fetch student fees");
  }

  const data: StudentFeesByStudentResponse = await response.json();
  return data;
};

export const useStudentFeesByStudent = (params: StudentFeesByStudentParams) => {
  return useQuery({
    queryKey: ["student-fees-by-student", params],
    queryFn: () => fetchStudentFeesByStudent(params),
    staleTime: 5 * 60 * 1000,
  });
};

