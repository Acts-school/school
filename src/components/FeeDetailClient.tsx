"use client";

import { useState } from "react";
import Table from "@/components/Table";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { useStudentFees, type StudentFeeRow } from "@/hooks/useStudentFees";
import StudentFeePaymentFormInline from "@/components/StudentFeePaymentFormInline";
import StudentFeeReminderButton from "@/components/StudentFeeReminderButton";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export type FeeDetailClientProps = {
  fee: {
    id: number;
    name: string;
    description: string | null;
    amount: number;
    active: boolean;
    class: { id: number; name: string } | null;
    _count: { studentFees: number };
  };
};

const FeeDetailClient = ({ fee }: FeeDetailClientProps) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useStudentFees({
    structureId: fee.id,
    page,
    limit: 10,
    ...(search ? { search } : {}),
  });

  const studentFees: StudentFeeRow[] = data?.data ?? [];
  const totalCount = data?.pagination.total ?? 0;

  const columns = [
    { header: "Student", accessor: "student" },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    { header: "Due", accessor: "due" },
    { header: "Paid", accessor: "paid" },
    { header: "Outstanding", accessor: "outstanding" },
    { header: "Status", accessor: "status", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "actions" },
  ];

  const renderRow = (item: StudentFeeRow) => {
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
        <td>{formatKES(item.amountDue)}</td>
        <td>{formatKES(item.amountPaid)}</td>
        <td>{formatKES(outstanding)}</td>
        <td className="hidden md:table-cell">{item.status}</td>
        <td className="align-top p-2">
          {outstanding > 0 ? (
            <div className="flex flex-col gap-2">
              <StudentFeePaymentFormInline
                studentFeeId={item.id}
                outstandingMinor={outstanding}
              />
              <StudentFeeReminderButton studentFeeId={item.id} />
            </div>
          ) : (
            <span className="text-xs text-gray-500">Paid</span>
          )}
        </td>
      </tr>
    );
  };

  if (error) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500">Error occurred: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Student Fees</h2>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onSearch={setSearch} />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lamaPurple" />
        </div>
      )}

      {!isLoading && (
        <>
          <Table columns={columns} renderRow={renderRow} data={studentFees} />
          <Pagination page={data?.pagination.page ?? page} count={totalCount} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default FeeDetailClient;
