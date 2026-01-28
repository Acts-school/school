"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import FormContainerClient from "@/components/FormContainerClient";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { useParentsList, type Parent } from "@/hooks/useParents";

export default function ParentListClient() {
  const rawSearchParams = useSearchParams();
  const searchParams = useMemo(
    () => rawSearchParams ?? new URLSearchParams(),
    [rawSearchParams],
  );
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const role = session?.user?.role;

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

  const { data } = useParentsList({
    page,
    limit: ITEM_PER_PAGE,
    ...(search ? { search } : {}),
  });

  const parents: Parent[] = data?.data ?? [];
  const totalCount = data?.pagination.total ?? 0;

  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Student Names",
      accessor: "students",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "ID Number",
      accessor: "address",
      className: "hidden lg:table-cell",
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

  const renderRow = (item: Parent) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">
        {item.students.map((student) => student.name).join(",")}
      </td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainerClient table="parent" type="update" data={item} />
              <FormContainerClient table="parent" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Parents</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onSearch={handleSearch} initialValue={search} />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormContainerClient table="parent" type="create" />}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={parents} />
      {/* PAGINATION */}
      <Pagination page={page} count={totalCount} onPageChange={handlePageChange} />
    </div>
  );
}
