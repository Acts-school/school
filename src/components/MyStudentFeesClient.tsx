"use client";

import { useState } from "react";
import Table from "@/components/Table";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { useMyStudentFees, type MyStudentFeeRow } from "@/hooks/useMyStudentFees";
import { useMyStudentFeesSummary } from "@/hooks/useMyStudentFeesSummary";
import StudentFeePaymentFormInline from "@/components/StudentFeePaymentFormInline";
import StudentFeePaymentsHistory from "@/components/StudentFeePaymentsHistory";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export type MyStudentFeesClientProps = {
  title: string;
  allowPayments: boolean;
  role: "student" | "parent" | "teacher";
  studentId?: string;
};

const MyStudentFeesClient = ({ title, allowPayments, role, studentId }: MyStudentFeesClientProps) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState<"" | "TERM1" | "TERM2" | "TERM3">("");

  const { data, isLoading, error, refetch } = useMyStudentFees({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(term ? { term } : {}),
    ...(studentId ? { studentId } : {}),
  });

  const rows: MyStudentFeeRow[] = data?.data ?? [];
  const totalCount = data?.pagination.total ?? 0;

  const hideAmounts = role === "student" || role === "teacher";

  const summaryQuery = useMyStudentFeesSummary(
    term ? { term, ...(studentId ? { studentId } : {}) } : (studentId ? { studentId } : {}),
    !hideAmounts,
  );
  const summary = summaryQuery.data;

  const columns = [
    { header: "Student", accessor: "student" },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    { header: "Fee", accessor: "fee", className: "hidden md:table-cell" },
    ...(!hideAmounts
      ? [
          { header: "Due", accessor: "due" },
          { header: "Paid", accessor: "paid" },
          { header: "Outstanding", accessor: "outstanding" },
        ]
      : []),
    { header: "Status", accessor: "status", className: "hidden md:table-cell" },
    { header: "History", accessor: "history" },
    ...(allowPayments ? [{ header: "Actions", accessor: "actions" }] : []),
  ];

  const renderRow = (item: MyStudentFeeRow) => {
    const outstanding = Math.max(item.amountDue - item.amountPaid, 0);

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="p-4">
          <div className="flex flex-col">
            <span className="font-semibold">{`${item.student.name} ${item.student.surname}`}</span>
          </div>
        </td>
        <td className="hidden md:table-cell">{item.student.class.name}</td>
        <td className="hidden md:table-cell">{item.structure?.name ?? item.feeCategory?.name ?? "-"}</td>
        {!hideAmounts && (
          <>
            <td>{formatKES(item.amountDue)}</td>
            <td>{formatKES(item.amountPaid)}</td>
            <td>{formatKES(outstanding)}</td>
          </>
        )}
        <td className="hidden md:table-cell">{item.status}</td>
        <td className="align-top p-2">
          <StudentFeePaymentsHistory
            studentFeeId={item.id}
            showAmounts={!hideAmounts}
          />
        </td>
        {allowPayments && (
          <td className="align-top p-2">
            {outstanding > 0 ? (
              <StudentFeePaymentFormInline
                studentFeeId={item.id}
                outstandingMinor={outstanding}
              />
            ) : (
              <span className="text-xs text-gray-500">Paid</span>
            )}
          </td>
        )}
      </tr>
    );
  };

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to load fees";

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500 mb-3">Error: {message}</div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="px-3 py-1.5 text-xs rounded-md bg-gray-800 text-white hover:bg-gray-900"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onSearch={setSearch} />
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-xs md:w-32"
            value={term}
            onChange={(e) =>
              setTerm(e.target.value as "" | "TERM1" | "TERM2" | "TERM3")
            }
          >
            <option value="">All terms</option>
            <option value="TERM1">Term 1</option>
            <option value="TERM2">Term 2</option>
            <option value="TERM3">Term 3</option>
          </select>
        </div>
      </div>

      {!hideAmounts && summary && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-700 mb-2 justify-end">
          <span>
            <span className="font-semibold">Total Due:</span>{" "}
            {formatKES(summary.totalDue)}
          </span>
          <span>
            <span className="font-semibold">Paid (this term):</span>{" "}
            {formatKES(summary.totalPaidRaw)}
          </span>
          {summary.pastCredit > 0 && (
            <span>
              <span className="font-semibold">Credit from previous terms:</span>{" "}
              {formatKES(summary.pastCredit)}
            </span>
          )}
          <span>
            <span className="font-semibold">Effective Balance:</span>{" "}
            {formatKES(summary.balance)}
          </span>
          {summary.rolloverForward > 0 && (
            <span>
              <span className="font-semibold">Credit to next term:</span>{" "}
              {formatKES(summary.rolloverForward)}
            </span>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lamaPurple" />
        </div>
      )}

      {!isLoading && (
        <>
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No fees found for the current filters.
            </div>
          ) : (
            <>
              <Table columns={columns} renderRow={renderRow} data={rows} />
              <Pagination
                page={data?.pagination.page ?? page}
                count={totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyStudentFeesClient;
