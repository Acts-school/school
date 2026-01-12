import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";

const TeacherCbcReportsPage = async () => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const teacherId = session?.user?.id;

  if (!session || role !== "teacher" || !teacherId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-sm text-gray-700">
          CBC reports lookup is only available to teachers.
        </p>
      </div>
    );
  }

  const { academicYear, term } = await getSchoolSettingsDefaults();

  const classes = await prisma.class.findMany({
    where: {
      supervisorId: teacherId,
    },
    select: {
      id: true,
      name: true,
      students: {
        select: {
          id: true,
          name: true,
          surname: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">CBC Reports Lookup</h1>
          <p className="text-xs text-gray-500">
            Academic year {academicYear}, term {term}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Select a learner below to open their CBC end-of-term report as a PDF.
          </p>
        </div>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-gray-600">
          No classes are currently assigned to you as class teacher.
        </p>
      ) : (
        <div className="space-y-6">
          {classes.map((classItem) => (
            <div key={classItem.id}>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">
                Class {classItem.name}
              </h2>
              {classItem.students.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No students found in this class.
                </p>
              ) : (
                <ul className="text-sm text-gray-700 divide-y divide-gray-100">
                  {classItem.students.map((student) => (
                    <li
                      key={student.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span>
                        {student.name} {student.surname}
                      </span>
                      <a
                        href={`/api/cbc-reports/student/${student.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Print CBC report (PDF)
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherCbcReportsPage;
