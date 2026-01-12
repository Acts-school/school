"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import FormContainerClient from "@/components/FormContainerClient";
import { ITEM_PER_PAGE } from "@/lib/settings";
import {
  useAnnouncementsList,
  type AnnouncementListItem,
} from "@/hooks/useAnnouncements";

export default function AnnouncementListClient() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const { data: session } = useSession();

  const role = session?.user?.role;

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

  const { data } = useAnnouncementsList(listParams);

  const announcements: AnnouncementListItem[] = data?.data ?? [];
  const totalCount = data?.pagination.total ?? 0;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Date",
      accessor: "date",
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

  const renderRow = (item: AnnouncementListItem) => {
    const date = new Date(item.date);

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="flex items-center gap-4 p-4">{item.title}</td>
        <td>{item.class?.name || "-"}</td>
        <td className="hidden md:table-cell">
          {new Intl.DateTimeFormat("en-US").format(date)}
        </td>
        <td>
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <>
                <FormContainerClient table="announcement" type="update" data={item} />
                <FormContainerClient table="announcement" type="delete" id={item.id} />
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
        <h1 className="hidden md:block text-lg font-semibold">
          All Announcements
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && (
              <FormContainerClient table="announcement" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={announcements} />
      {/* PAGINATION */}
      <Pagination page={safePage} count={totalCount} />
    </div>
  );
}
