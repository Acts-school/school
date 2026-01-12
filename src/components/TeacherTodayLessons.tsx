"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import LessonObservationCard from "@/components/LessonObservationCard";

type LessonStudent = {
  id: string;
  name: string;
  surname: string;
};

type DayLiteral = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

type TeacherLesson = {
  id: number;
  name: string;
  day: DayLiteral;
  subject: {
    name: string;
  };
  class: {
    name: string;
    students: LessonStudent[];
  };
};

const isTeacherLessonArray = (data: unknown): data is TeacherLesson[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const lesson = item as {
      id?: unknown;
      name?: unknown;
      day?: unknown;
      subject?: unknown;
      class?: unknown;
    };

    if (typeof lesson.id !== "number" || typeof lesson.name !== "string") {
      return false;
    }

    const day = lesson.day;
    if (
      day !== "MONDAY" &&
      day !== "TUESDAY" &&
      day !== "WEDNESDAY" &&
      day !== "THURSDAY" &&
      day !== "FRIDAY"
    ) {
      return false;
    }

    const subject = lesson.subject as { name?: unknown } | undefined;
    if (!subject || typeof subject.name !== "string") {
      return false;
    }

    const classObj = lesson.class as {
      name?: unknown;
      students?: unknown;
    } | null;

    if (!classObj || typeof classObj.name !== "string" || !Array.isArray(classObj.students)) {
      return false;
    }

    return classObj.students.every((s) => {
      if (typeof s !== "object" || s === null) {
        return false;
      }

      const st = s as {
        id?: unknown;
        name?: unknown;
        surname?: unknown;
      };

      return (
        typeof st.id === "string" &&
        typeof st.name === "string" &&
        typeof st.surname === "string"
      );
    });
  });
};

const mapTodayToDayLiteral = (today: Date): DayLiteral | null => {
  const dayOfWeek = today.getDay();

  switch (dayOfWeek) {
    case 1:
      return "MONDAY";
    case 2:
      return "TUESDAY";
    case 3:
      return "WEDNESDAY";
    case 4:
      return "THURSDAY";
    case 5:
      return "FRIDAY";
    default:
      return null;
  }
};

const filterLessonsForToday = (lessons: TeacherLesson[]): TeacherLesson[] => {
  const todayLiteral = mapTodayToDayLiteral(new Date());

  if (todayLiteral === null) {
    return [];
  }

  return lessons.filter((lesson) => lesson.day === todayLiteral);
};

const TeacherTodayLessons = ({ teacherId }: { teacherId: string }) => {
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/teacher-lessons?teacherId=${teacherId}`);
        if (!response.ok) {
          toast.error("Error loading lessons");
          return;
        }

        const json: unknown = await response.json();
        if (isTeacherLessonArray(json)) {
          setLessons(json);
        } else {
          toast.error("Unexpected lesson data received");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading teacher lessons for today", error);
        toast.error("Error loading lessons");
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherId) {
      void fetchLessons();
    }
  }, [teacherId]);

  const todayLessons = filterLessonsForToday(lessons);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Today&apos;s lessons</h2>
      {isLoading ? (
        <p className="text-sm text-gray-700">Loading lessons...</p>
      ) : todayLessons.length === 0 ? (
        <p className="text-sm text-gray-700">No lessons scheduled for today.</p>
      ) : (
        <div className="space-y-4">
          {todayLessons.map((lesson) => (
            <LessonObservationCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherTodayLessons;
