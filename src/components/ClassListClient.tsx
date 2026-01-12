"use client";

import { useState } from "react";
import { useClasses } from "@/hooks/useClasses";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import { useSession } from "next-auth/react";
import FormContainerClient from "@/components/FormContainerClient";

type ClassList = {
  id: number;
  name: string;
  capacity: number;
  supervisor: { name: string; surname: string };
  _count: { students: number };
};

const ClassListClient = () => {
  const { data: session } = useSession();
  const role = session?.user?.role;
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  
  const { data, isLoading, error } = useClasses({ 
    page,
    ...(search ? { search } : {}),
    limit: 10,
  });

  const columns = [
    {
      header: "Class Name",
      accessor: "name",
    },
    {
      header: "Capacity",
      accessor: "capacity",
      className: "hidden md:table-cell",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Supervisor",
      accessor: "supervisor",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: ClassList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.capacity}</td>
      <td className="hidden md:table-cell">{item.name[0]}</td>
      <td className="hidden md:table-cell">
        {item.supervisor?.name + " " + item.supervisor?.surname}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainerClient table="class" type="update" data={item} />
              <FormContainerClient table="class" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  if (error) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500">
          Error occurred: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onSearch={setSearch} />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && (
              <FormContainerClient table="class" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lamaPurple"></div>
        </div>
      )}

      {/* LIST */}
      {!isLoading && data && (
        <>
          <Table columns={columns} renderRow={renderRow} data={data.data} />
          <Pagination 
            page={data.pagination.page} 
            count={data.pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default ClassListClient;