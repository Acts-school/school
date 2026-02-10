"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TableSearch from "@/components/TableSearch";

const ClearanceSearchClient = () => {
  const rawSearchParams = useSearchParams();
  const searchParams = useMemo(
    () => rawSearchParams ?? new URLSearchParams(),
    [rawSearchParams],
  );
  const pathname = usePathname();
  const router = useRouter();

  const initialSearch = searchParams.get("search") ?? "";

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }

    const query = params.toString();
    const basePath = pathname ?? "";
    const url = query ? `${basePath}?${query}` : basePath;
    router.replace(url);
  };

  return <TableSearch onSearch={handleSearch} initialValue={initialSearch} />;
};

export default ClearanceSearchClient;
