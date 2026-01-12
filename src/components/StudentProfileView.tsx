import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import Performance from "@/components/Performance";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import StudentFeesInlineCard from "@/components/StudentFeesInlineCard";
import type { TermLiteral } from "@/lib/schoolSettings";
import type { Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export type RecentResultRow = {
  id: number;
  title: string;
  subjectName: string;
  score: number;
  date: Date;
  isBelowPassing: boolean;
};

export type StudentWithClassCounts = Student & {
  class: {
    id: number;
    name: string;
    _count: {
      lessons: number;
    };
  };
};

export type ResultsSummary = {
  total: number;
  passing: number;
  totalScore: number;
};

export type StudentProfileViewProps = {
  student: StudentWithClassCounts;
  role: string | undefined;
  term: TermLiteral;
  academicYear: number;
  passingScore: number | null;
  recentResults: RecentResultRow[];
  resultsSummary: ResultsSummary;
  averageScore: number | null;
};

const StudentProfileView = ({
  student,
  role,
  term,
  academicYear,
  passingScore,
  recentResults,
  resultsSummary,
  averageScore,
}: StudentProfileViewProps) => {
  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO CARD */}
          <div className="bg-lamaSky py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={student.img || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>
            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">
                  {student.name + " " + student.surname}
                </h1>
                {role === "admin" && (
                  <FormContainer table="student" type="update" data={student} />
                )}
              </div>
              <p className="text-sm text-gray-500">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit.
              </p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span>{student.bloodType}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>
                    {new Intl.DateTimeFormat("en-GB").format(student.birthday)}
                  </span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{student.email || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{student.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <Suspense fallback="loading...">
                <StudentAttendanceCard id={student.id} />
              </Suspense>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student.class.name.charAt(0)}th</h1>
                <span className="text-sm text-gray-400">Grade</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student.class._count.lessons}</h1>
                <span className="text-sm text-gray-400">Lessons</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student.class.name}</h1>
                <span className="text-sm text-gray-400">Class</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1>Student&apos;s Schedule</h1>
          <BigCalendarContainer type="classId" id={student.class.id} />
        </div>
        <div className="mt-4">
          <StudentFeesInlineCard
            studentId={student.id}
            initialTerm={term}
            initialYear={academicYear}
            canEdit={role === "admin" || role === "accountant"}
          />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-lamaSkyLight"
              href={`/list/lessons?classId=${student.class.id}`}
            >
              Student&apos;s Lessons
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaPurpleLight"
              href={`/list/teachers?classId=${student.class.id}`}
            >
              Student&apos;s Teachers
            </Link>
            <Link
              className="p-3 rounded-md bg-pink-50"
              href={`/list/exams?classId=${student.class.id}`}
            >
              Student&apos;s Exams
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaSkyLight"
              href={`/list/assignments?classId=${student.class.id}`}
            >
              Student&apos;s Assignments
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaYellowLight"
              href={`/list/results?studentId=${student.id}`}
            >
              Student&apos;s Results
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaSkyLight"
              href={`/api/cbc-reports/student/${student.id}/pdf`}
              target="_blank"
            >
              Student&apos;s CBC report (PDF)
            </Link>
            {(role === "admin" || role === "teacher") && (
              <Link
                className="p-3 rounded-md bg-lamaPurple text-white"
                href={`/list/messages?recipientId=${student.id}&recipientKind=student&recipientName=${encodeURIComponent(
                  `${student.name} ${student.surname}`,
                )}`}
              >
                Message this Student
              </Link>
            )}
          </div>
        </div>
        {recentResults.length > 0 && (
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-xl font-semibold">Recent Results</h1>
            <p className="text-xs text-gray-500 mt-1">
              Passing score:{" "}
              {typeof passingScore === "number" && !Number.isNaN(passingScore)
                ? `${passingScore}%`
                : "Not set"}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {recentResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[140px]">
                      {result.title}
                    </span>
                    <span className="text-xs text-gray-500">{result.subjectName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        result.isBelowPassing
                          ? "text-red-600 font-semibold"
                          : "text-green-600 font-semibold"
                      }
                    >
                      {result.score}%
                    </span>
                    <span
                      className={
                        "text-xs px-2 py-0.5 rounded-full " +
                        (result.isBelowPassing
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700")
                      }
                    >
                      {result.isBelowPassing ? "Fail" : "Pass"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-2 text-xs text-gray-600 flex justify-between">
              <span>
                Overall: {resultsSummary.passing}/{resultsSummary.total} passing
              </span>
              {averageScore !== null && <span>Avg: {averageScore.toFixed(1)}%</span>}
            </div>
          </div>
        )}
        <Performance />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentProfileView;
