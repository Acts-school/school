import prisma from "@/lib/prisma";
import type { Attendance } from "@prisma/client";

const StudentAttendanceCard = async ({ id }: { id: string }) => {
  const attendance: Array<Pick<Attendance, "present">> = await prisma.attendance.findMany({
    select: { present: true },
    where: {
      studentId: id,
      date: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
  });

  const totalDays = attendance.length;
  const presentDays = attendance.filter((day: { present: boolean }) => day.present).length;
  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  return (
    <div className="">
      <h1 className="text-xl font-semibold">{percentage || "-"}%</h1>
      <span className="text-sm text-gray-400">Attendance</span>
    </div>
  );
};

export default StudentAttendanceCard;
