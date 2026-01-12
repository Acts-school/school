"use client";

import { useEffect, useMemo, useState } from "react";
import { useSubjects } from "@/hooks/useSubjects";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import { useSession } from "next-auth/react";
import FormContainerClient from "@/components/FormContainerClient";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SubjectList = {
  id: number;
  name: string;
  teachers: { name: string }[];
  _count: {
    teachers: number;
    lessons: number;
  };
};

const SubjectListClient = () => {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const rawSearchParams = useSearchParams();
  const searchParams = useMemo(
    () => rawSearchParams ?? new URLSearchParams(),
    [rawSearchParams],
  );
  const pathname = usePathname();
  const router = useRouter();

  const initialSearch = searchParams.get("search") ?? "";
  const initialPageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const initialPage = Number.isFinite(initialPageParam) && initialPageParam > 0 ? initialPageParam : 1;

  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextPageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const nextPage = Number.isFinite(nextPageParam) && nextPageParam > 0 ? nextPageParam : 1;
    setSearch(nextSearch);
    setPage(nextPage);
  }, [searchParams]);

  const updateUrl = (nextPage: number, nextSearch: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextPage > 1) {
      params.set("page", nextPage.toString());
    } else {
      params.delete("page");
    }

    if (nextSearch) {
      params.set("search", nextSearch);
    } else {
      params.delete("search");
    }

    const query = params.toString();
    const basePath = pathname ?? "";
    const url = query ? `${basePath}?${query}` : basePath;
    router.replace(url);
  };

  const handleSearch = (value: string) => {
    const nextSearch = value;
    const nextPage = 1;
    setSearch(nextSearch);
    setPage(nextPage);
    updateUrl(nextPage, nextSearch);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    updateUrl(nextPage, search);
  };

  const { data, isLoading, error } = useSubjects({
    page,
    ...(search ? { search } : {}),
    limit: 10,
  });

  const columns = [
    {
      header: "Subject Name",
      accessor: "name",
    },
    {
      header: "Teachers",
      accessor: "teachers",
      className: "hidden md:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
    },
  ];

  const renderRow = (item: SubjectList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">
        {item.teachers?.map((teacher) => teacher.name).join(",")}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainerClient table="subject" type="update" data={item} />
              <FormContainerClient table="subject" type="delete" id={item.id} />
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
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onSearch={handleSearch} initialValue={search} />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && (
              <FormContainerClient table="subject" type="create" />
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
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default SubjectListClient;