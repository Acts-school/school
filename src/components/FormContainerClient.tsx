"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import FormModal from "./FormModal";

export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "attendance"
    | "event"
    | "announcement"
    | "fees";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainerClient = ({ table, type, data, id }: FormContainerProps) => {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const currentUserId = session?.user?.id;

  // Ma'lumotlar yuklanadi faqat type !== "delete" bo'lganida
  const { data: relatedData = {} } = useQuery({
    queryKey: ['form-related-data', table, type],
    queryFn: async () => {
      if (type === "delete") return {};
      
      const response = await fetch(`/api/${table}/form-data`);
      if (!response.ok) {
        throw new Error('Failed to fetch form data');
      }
      return response.json();
    },
    enabled: type !== "delete",
  });

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        relatedData={relatedData}
        {...(id !== undefined ? { id } : {})}
      />
    </div>
  );
};

export default FormContainerClient;