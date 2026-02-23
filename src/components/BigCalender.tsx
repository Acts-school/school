"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";

const localizer = momentLocalizer(moment);

const BigCalendar = ({
  data,
}: {
  data: { title: string; start: Date; end: Date }[];
}) => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      events={data}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "day"]}
      view={view}
      style={{ height: "100%", width: "100%" }}
      onView={handleOnChangeView}
      // Show only the core school day: 10:00 AM - 9:00 PM
      min={new Date(2025, 1, 1, 7, 0, 0)}
      max={new Date(2025, 1, 1, 21, 0, 0)}
      // Align rows to 1-hour blocks, split into two 30-min slots
      step={30}
      timeslots={2}
    />
  );
};

export default BigCalendar;
