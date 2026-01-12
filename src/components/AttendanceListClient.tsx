"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import FormContainerClient from "@/components/FormContainerClient";
import AttendanceManagement from "@/components/AttendanceManagement";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { useAttendanceList, type AttendanceListItem } from "@/hooks/useAttendance";

export default function AttendanceListClient() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const { data: session } = useSession();
  const pageParam = searchParams.get("page");
  const rawSearch = searchParams.get("search");

  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;

  const search = rawSearch ?? undefined;

  const listParams = {
    page: safePage,
    limit: ITEM_PER_PAGE,
    ...(search !== undefined ? { search } : {}),
  };

  const { data } = useAttendanceList(listParams);

  const attendance: AttendanceListItem[] = data?.data ?? [];
  const totalCount = data?.pagination.total ?? 0;

  const role = session?.user?.role;
  const currentUserId = session?.user?.id;

  // Preserve teacher-specific management view
  if (role === "teacher" && currentUserId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <AttendanceManagement teacherId={currentUserId} />
      </div>
    );
  }

  const columns = [
    {
      header: "Student Name",
      accessor: "studentName",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Subject",
      accessor: "subject",
      className: "hidden md:table-cell",
    },
    {
      header: "Lesson",
      accessor: "lesson",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden lg:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: AttendanceListItem) => {
    const date = new Date(item.date);

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="p-4">
          {item.student.name} {item.student.surname}
        </td>
        <td className="hidden md:table-cell">{item.student.class.name}</td>
        <td className="hidden md:table-cell">{item.lesson.subject.name}</td>
        <td className="hidden md:table-cell">{item.lesson.name}</td>
        <td className="hidden lg:table-cell">
          {new Intl.DateTimeFormat("en-GB").format(date)}
        </td>
        <td>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              item.present
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {item.present ? "Present" : "Absent"}
          </span>
        </td>
        <td>
          <div className="flex items-center gap-2">
            {(role === "admin" || role === "teacher") && (
              <>
                <FormContainerClient table="attendance" type="update" data={item} />
                <FormContainerClient table="attendance" type="delete" id={item.id} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Attendance</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {(role === "admin" || role === "teacher") && (
              <FormContainerClient table="attendance" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={attendance} />
      {/* PAGINATION */}
      <Pagination page={safePage} count={totalCount} />
    </div>
  );
}
