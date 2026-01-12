"use client";

import { useState } from "react";

import type { CreateLearningObservationInput } from "@/hooks/useLearningObservations";
import { useCreateLearningObservation } from "@/hooks/useLearningObservations";

type LessonStudent = {
  id: string;
  name: string;
  surname: string;
};

type DayLiteral = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

type LessonObservationCardLesson = {
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

const LessonObservationCard = ({
  lesson,
}: {
  lesson: LessonObservationCardLesson;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  const createObservationMutation = useCreateLearningObservation();

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      return;
    }

    const trimmedNotes = notes.trim();

    const payload: CreateLearningObservationInput =
      trimmedNotes === ""
        ? {
            lessonId: lesson.id,
            studentIds: selectedStudentIds,
          }
        : {
            lessonId: lesson.id,
            studentIds: selectedStudentIds,
            notes: trimmedNotes,
          };

    createObservationMutation.mutate(payload, {
      onSuccess: () => {
        setIsOpen(false);
        setSelectedStudentIds([]);
        setNotes("");
      },
    });
  };

  return (
    <div className="border border-gray-200 rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {lesson.subject.name} - {lesson.class.name}
          </p>
          <p className="text-xs text-gray-600">{lesson.name}</p>
        </div>
        <button
          type="button"
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setIsOpen(true)}
          disabled={createObservationMutation.isPending}
        >
          Add observation
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-1">
        Students: {lesson.class.students.length}
      </p>

      {isOpen && (
        <div className="w-screen h-screen fixed left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%] max-h-[80vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Add observation
              </h3>
              <p className="text-xs text-gray-600">
                {lesson.subject.name} - {lesson.class.name} - {lesson.name}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Students
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                {lesson.class.students.map((student) => {
                  const checked = selectedStudentIds.includes(student.id);

                  return (
                    <label
                      key={student.id}
                      className="flex items-center gap-2 text-xs text-gray-800 py-1"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={checked}
                        onChange={() => toggleStudentSelection(student.id)}
                      />
                      <span>
                        {student.name} {student.surname}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md text-xs"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  if (!createObservationMutation.isPending) {
                    setIsOpen(false);
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={
                  createObservationMutation.isPending || selectedStudentIds.length === 0
                }
              >
                {createObservationMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonObservationCard;
