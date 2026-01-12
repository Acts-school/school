import Image from "next/image";
import CountChart from "./CountChart";
import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";

const CountChartContainer = async () => {
  const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

  let boys = 0;
  let girls = 0;

  if (schoolId !== null) {
    const grouped = await prisma.student.groupBy({
      by: ["sex"],
      _count: { _all: true },
      where: {
        class: {
          schoolId,
        },
      },
    });

    boys = grouped.find((d) => d.sex === "MALE")?._count._all ?? 0;
    girls = grouped.find((d) => d.sex === "FEMALE")?._count._all ?? 0;
  } else if (isSuperAdmin) {
    const grouped = await prisma.student.groupBy({
      by: ["sex"],
      _count: { _all: true },
    });

    boys = grouped.find((d) => d.sex === "MALE")?._count._all ?? 0;
    girls = grouped.find((d) => d.sex === "FEMALE")?._count._all ?? 0;
  }

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Students</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      {/* CHART */}
      <CountChart boys={boys} girls={girls} />
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lamaSky rounded-full" />
          <h1 className="font-bold">{boys}</h1>
          <h2 className="text-xs text-gray-300">
            Boys ({boys + girls > 0 ? Math.round((boys / (boys + girls)) * 100) : 0}%)
          </h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lamaYellow rounded-full" />
          <h1 className="font-bold">{girls}</h1>
          <h2 className="text-xs text-gray-300">
            Girls ({boys + girls > 0 ? Math.round((girls / (boys + girls)) * 100) : 0}%)
          </h2>
        </div>
      </div>
    </div>
  );
};

export default CountChartContainer;

