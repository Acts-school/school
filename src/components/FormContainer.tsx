import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";
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
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const currentUserId = session?.user?.id;

  if (type !== "delete") {
    switch (table) {
      case "subject":
        const subjectTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;
      case "class":
        const classGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;
      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubjects };
        break;
      case "lesson":
        const lessonSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        const lessonClasses = await prisma.class.findMany({
          select: { id: true, name: true },
        });
        const lessonTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = {
          subjects: lessonSubjects,
          classes: lessonClasses,
          teachers: lessonTeachers,
        };
        break;
      case "student":
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        relatedData = { classes: studentClasses, grades: studentGrades };
        break;
      case "parent":
        const parentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const parentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        relatedData = { classes: parentClasses, grades: parentGrades };
        break;
      case "exam":
        const examLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { id: true, name: true },
        });
        relatedData = { lessons: examLessons };
        break;
      case "assignment":
        const assignmentLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { id: true, name: true },
        });
        relatedData = { lessons: assignmentLessons };
        break;
      case "attendance":
        const attendanceLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { 
            id: true, 
            name: true,
            subject: { select: { name: true } },
            class: { select: { name: true } }
          },
        });
        
        const attendanceStudents = await prisma.student.findMany({
          where: {
            ...(role === "teacher" ? { 
              class: { 
                lessons: { 
                  some: { teacherId: currentUserId! } 
                } 
              } 
            } : {}),
          },
          select: { 
            id: true, 
            name: true, 
            surname: true,
            class: { select: { name: true } }
          },
        });
        
        relatedData = { 
          lessons: attendanceLessons, 
          students: attendanceStudents 
        };
        break;
      case "result":
        const resultStudents = await prisma.student.findMany({
          where: {
            ...(role === "teacher"
              ? {
                  class: {
                    lessons: {
                      some: { teacherId: currentUserId! },
                    },
                  },
                }
              : {}),
          },
          select: {
            id: true,
            name: true,
            surname: true,
          },
        });

        const resultExams = await prisma.exam.findMany({
          where: {
            ...(role === "teacher"
              ? { lesson: { teacherId: currentUserId! } }
              : {}),
          },
          select: { id: true, title: true },
        });

        const resultAssignments = await prisma.assignment.findMany({
          where: {
            ...(role === "teacher"
              ? { lesson: { teacherId: currentUserId! } }
              : {}),
          },
          select: { id: true, title: true },
        });

        relatedData = {
          students: resultStudents,
          exams: resultExams,
          assignments: resultAssignments,
        };
        break;
      case "announcement":
        const announcementClasses = await prisma.class.findMany({
          select: { id: true, name: true },
        });
        relatedData = { classes: announcementClasses };
        break;
      case "event": {
        const { schoolId } = await getCurrentSchoolContext();
        const eventClasses = await prisma.class.findMany({
          where: schoolId !== null ? { schoolId } : {},
          select: { id: true, name: true },
        });
        relatedData = { classes: eventClasses };
        break;
      }

      default:
        break;
    }
  }

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

export default FormContainer;
