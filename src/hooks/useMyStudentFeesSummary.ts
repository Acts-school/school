import { useQuery } from "@tanstack/react-query";

export type TermLiteral = "TERM1" | "TERM2" | "TERM3";

export interface MyStudentFeesSummary {
  term: TermLiteral | null;
  year: number | null;
  totalDue: number;
  totalPaidRaw: number;
  pastCredit: number;
  effectivePaid: number;
  balance: number;
  rolloverForward: number;
}

export interface MyStudentFeesSummaryParams {
  term?: TermLiteral;
  studentId?: string;
}

const buildSearchParams = (params: MyStudentFeesSummaryParams): string => {
  const searchParams = new URLSearchParams();

  if (params.term) searchParams.set("term", params.term);
  if (params.studentId) searchParams.set("studentId", params.studentId);

  return searchParams.toString();
};

const fetchMyStudentFeesSummary = async (
  params: MyStudentFeesSummaryParams,
): Promise<MyStudentFeesSummary> => {
  const query = buildSearchParams(params);
  const url = query ? `/api/student-fees/my/summary?${query}` : "/api/student-fees/my/summary";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch fees summary");
  }

  const data: MyStudentFeesSummary = await response.json();
  return data;
};

export const useMyStudentFeesSummary = (
  params: MyStudentFeesSummaryParams,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ["my-student-fees-summary", params],
    queryFn: () => fetchMyStudentFeesSummary(params),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
};
