import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";
import type { Event } from "@prisma/client";

const EventList = async ({ dateParam }: { dateParam: string | undefined }) => {
  const date = dateParam ? new Date(dateParam) : new Date();

  const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let data: Array<Pick<Event, "id" | "title" | "startTime" | "description">> = [];

  if (schoolId !== null) {
    data = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        startTime: true,
        description: true,
      },
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        OR: [
          {
            class: {
              schoolId,
            },
          },
          {
            classId: null,
          },
        ],
      },
    });
  } else if (isSuperAdmin) {
    data = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        startTime: true,
        description: true,
      },
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  return data.map((event) => (
    <div
      className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple"
      key={event.id}
    >
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-600">{event.title}</h1>
        <span className="text-gray-300 text-xs">
          {event.startTime.toLocaleTimeString("en-UK", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
      <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
    </div>
  ));
};

export default EventList;

