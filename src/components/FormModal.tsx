"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainerClient";
import { useDeleteTeacher } from "@/hooks/useTeachers";
import { useDeleteStudent } from "@/hooks/useStudents";
import { useDeleteClass } from "@/hooks/useClasses";
import { useDeleteSubject } from "@/hooks/useSubjects";
import { useDeleteAnnouncement } from "@/hooks/useAnnouncements";
import { useDeleteParent } from "@/hooks/useParents";
import { useDeleteLesson } from "@/hooks/useLessons";
import { useDeleteAssignment } from "@/hooks/useAssignments";
import { useDeleteEvent } from "@/hooks/useEvents";
import { useDeleteResult } from "@/hooks/useResults";
import type { FeeStructureRow } from "@/hooks/useFees";


// USE LAZY LOADING

// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ParentForm = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AssignmentForm = dynamic(() => import("./forms/AssignmentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const FeeForm = dynamic(() => import("./forms/FeeForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <h1>Loading...</h1>,
});
// TODO: OTHER FORMS

// Default form komponenti mavjud bo'lmagan table'lar uchun
const DefaultForm = ({ setOpen, type, table }: { setOpen: Dispatch<SetStateAction<boolean>>, type: string, table: string }) => (
  <div className="p-4 flex flex-col gap-4">
    <h2 className="text-lg font-semibold">{table} Form</h2>
    <p className="text-gray-500">This form has not been created yet.</p>
    <button 
      onClick={() => setOpen(false)}
      className="bg-blue-500 text-white py-2 px-4 rounded-md"
    >
      Close
    </button>
  </div>
);

type FeeFormRelatedData = {
  classes?: Array<{ id: number; name: string }>;
  grades?: Array<{ id: number; level: number }>;
};

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: unknown,
    relatedData?: unknown
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exam: (setOpen, type, data, relatedData) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  attendance: (setOpen, type, data, relatedData) => (
    <AttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  fees: (setOpen, type, data, relatedData) => (
    <FeeForm
      type={type}
      {...(data !== undefined ? { data: data as FeeStructureRow } : {})}
      setOpen={setOpen}
      relatedData={relatedData as FeeFormRelatedData}
    />
  ),
  // Mavjud bo'lmagan formalar uchun default form
  parent: (setOpen, type, data, relatedData) => (
    <ParentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  assignment: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  result: (setOpen, type, data, relatedData) => (
    <ResultForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  announcement: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: unknown }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-lamaSky"
      : "bg-lamaPurple";

  const [open, setOpen] = useState(false);

  const Form = () => {
    // Delete mutation hooklar
    const deleteTeacherMutation = useDeleteTeacher();
    const deleteParentMutation = useDeleteParent();
    const deleteStudentMutation = useDeleteStudent();
    const deleteClassMutation = useDeleteClass();
    const deleteSubjectMutation = useDeleteSubject();
    const deleteAnnouncementMutation = useDeleteAnnouncement();
    const deleteLessonMutation = useDeleteLesson();
    const deleteAssignmentMutation = useDeleteAssignment();
    const deleteEventMutation = useDeleteEvent();
    const deleteResultMutation = useDeleteResult();

    const handleDelete = async () => {
      if (!id) return;

      try {
        switch (table) {
          case "teacher":
            await deleteTeacherMutation.mutateAsync(id.toString());
            break;
          case "lesson":
            await deleteLessonMutation.mutateAsync(id);
            break;
          case "assignment":
            await deleteAssignmentMutation.mutateAsync(id);
            break;
          case "event":
            await deleteEventMutation.mutateAsync(id);
            break;
          case "result":
            await deleteResultMutation.mutateAsync(id);
            break;
          case "parent":
            await deleteParentMutation.mutateAsync(id.toString());
            break;
          case "student":
            await deleteStudentMutation.mutateAsync(id.toString());
            break;
          case "class":
            await deleteClassMutation.mutateAsync(id.toString());
            break;
          case "subject":
            await deleteSubjectMutation.mutateAsync(id.toString());
            break;
          case "announcement":
            await deleteAnnouncementMutation.mutateAsync(
              typeof id === "number" ? id : Number.parseInt(id, 10),
            );
            break;
          default:
            throw new Error(`Delete not implemented for ${table}`);
        }
        
        toast.success(`${table} deleted successfully!`);
        setOpen(false);
      } catch (error) {
        toast.error(`Error: Failed to delete ${table}`);
        console.error('Delete error:', error);
      }
    };

    const isDeleting =
      deleteTeacherMutation.isPending ||
      deleteParentMutation.isPending ||
      deleteStudentMutation.isPending ||
      deleteClassMutation.isPending ||
      deleteSubjectMutation.isPending ||
      deleteAnnouncementMutation.isPending ||
      deleteLessonMutation.isPending ||
      deleteAssignmentMutation.isPending ||
      deleteEventMutation.isPending ||
      deleteResultMutation.isPending;

    return type === "delete" && id ? (
      <div className="p-4 flex flex-col gap-4">
        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this {table}?
        </span>
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    ) : type === "create" || type === "update" ? (
      forms[table] ? forms[table](setOpen, type, data, relatedData) : <DefaultForm setOpen={setOpen} type={type} table={table} />
    ) : (
      "Form not found!"
    );
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%] max-h-[90vh] overflow-y-auto">
            <Form />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
