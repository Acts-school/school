import Image from "next/image";
import AttendanceChart from "./AttendanceChart";
import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";

const AttendanceChartContainer = async () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const lastMonday = new Date(today);

  lastMonday.setDate(today.getDate() - daysSinceMonday);

  const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

  type AttendanceRow = { date: Date; present: boolean };

  let resData: AttendanceRow[] = [];

  if (schoolId !== null) {
    resData = await prisma.attendance.findMany({
      where: {
        date: {
          gte: lastMonday,
        },
        lesson: {
          class: {
            schoolId,
          },
        },
      },
      select: {
        date: true,
        present: true,
      },
    });
  } else if (isSuperAdmin) {
    resData = await prisma.attendance.findMany({
      where: {
        date: {
          gte: lastMonday,
        },
      },
      select: {
        date: true,
        present: true,
      },
    });
  }

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
  type Day = (typeof daysOfWeek)[number];

  const attendanceMap: Record<Day, { present: number; absent: number }> = {
    Mon: { present: 0, absent: 0 },
    Tue: { present: 0, absent: 0 },
    Wed: { present: 0, absent: 0 },
    Thu: { present: 0, absent: 0 },
    Fri: { present: 0, absent: 0 },
  };

  resData.forEach((item) => {
    const itemDate = new Date(item.date);
    const itemDayOfWeek = itemDate.getDay();

    if (itemDayOfWeek >= 1 && itemDayOfWeek <= 5) {
      const dayName = daysOfWeek[itemDayOfWeek - 1] as Day;

      if (item.present) {
        attendanceMap[dayName].present += 1;
      } else {
        attendanceMap[dayName].absent += 1;
      }
    }
  });

  const data = daysOfWeek.map((day: Day) => ({
    name: day,
    present: attendanceMap[day].present,
    absent: attendanceMap[day].absent,
  }));

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Attendance</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <AttendanceChart data={data} />
    </div>
  );
};

export default AttendanceChartContainer;

