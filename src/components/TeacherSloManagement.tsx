"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { saveStudentSloRecords } from "@/lib/actions";
import type { TermLiteral } from "@/lib/schoolSettings";
import type { StudentSloBatchSchema } from "@/lib/formValidationSchemas";

type SloAchievementLevelLiteral =
  | "BELOW_EXPECTATIONS"
  | "APPROACHING_EXPECTATIONS"
  | "MEETING_EXPECTATIONS";

type LessonStudent = {
  id: string;
  name: string;
  surname: string;
};

type TeacherLesson = {
  id: number;
  name: string;
  subject: {
    name: string;
  };
  class: {
    name: string;
    students: LessonStudent[];
  };
};

type SloOption = {
  id: number;
  code: string | null;
  description: string;
  learningAreaName: string;
  strandName: string;
  subStrandName: string;
};

type StudentRecordInput = {
  studentId: string;
  level: SloAchievementLevelLiteral;
  comment: string;
};

const TERM_OPTIONS: { value: TermLiteral; label: string }[] = [
  { value: "TERM1", label: "Term 1" },
  { value: "TERM2", label: "Term 2" },
  { value: "TERM3", label: "Term 3" },
];

const SLO_LEVEL_OPTIONS: { value: SloAchievementLevelLiteral; label: string }[] = [
  { value: "BELOW_EXPECTATIONS", label: "Below expectations" },
  { value: "APPROACHING_EXPECTATIONS", label: "Approaching expectations" },
  { value: "MEETING_EXPECTATIONS", label: "Meeting expectations" },
];

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
      subject?: unknown;
      class?: unknown;
    };

    if (typeof lesson.id !== "number" || typeof lesson.name !== "string") {
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

const isSloOptionArray = (data: unknown): data is SloOption[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const slo = item as {
      id?: unknown;
      code?: unknown;
      description?: unknown;
      learningAreaName?: unknown;
      strandName?: unknown;
      subStrandName?: unknown;
    };

    if (typeof slo.id !== "number") {
      return false;
    }

    if (slo.code !== null && slo.code !== undefined && typeof slo.code !== "string") {
      return false;
    }

    return (
      typeof slo.description === "string" &&
      typeof slo.learningAreaName === "string" &&
      typeof slo.strandName === "string" &&
      typeof slo.subStrandName === "string"
    );
  });
};

const normalizeName = (value: string): string => value.trim().toLowerCase();

const sloMatchesLessonSubject = (params: {
  subjectName: string;
  learningAreaName: string;
}): boolean => {
  const subject = normalizeName(params.subjectName);
  const learningArea = normalizeName(params.learningAreaName);

  if (subject === "" || learningArea === "") {
    return false;
  }

  const keywordPairs: Array<{ subjectKeyword: string; learningAreaKeyword: string }> = [
    { subjectKeyword: "english", learningAreaKeyword: "english" },
    { subjectKeyword: "math", learningAreaKeyword: "math" },
    { subjectKeyword: "language", learningAreaKeyword: "language" },
  ];

  return keywordPairs.some((pair) => {
    return (
      subject.includes(pair.subjectKeyword) && learningArea.includes(pair.learningAreaKeyword)
    );
  });
};

const filterSlosForLesson = (
  options: SloOption[],
  lesson: TeacherLesson,
): SloOption[] => {
  const subjectName = lesson.subject.name;

  const matching = options.filter((slo) =>
    sloMatchesLessonSubject({ subjectName, learningAreaName: slo.learningAreaName }),
  );

  if (matching.length > 0) {
    return matching;
  }

  return options;
};

const mapToBatchPayload = (
  args: {
    term: TermLiteral;
    academicYear: number;
    sloId: number;
    lessonId: number;
    records: StudentRecordInput[];
  },
): StudentSloBatchSchema => {
  const { term, academicYear, sloId, lessonId, records } = args;

  const batch: StudentSloBatchSchema = {
    term,
    academicYear,
    sloId,
    lessonId,
    examId: undefined,
    assignmentId: undefined,
    records: records.map((record) => ({
      studentId: record.studentId,
      level: record.level,
      comment: record.comment === "" ? undefined : record.comment,
    })),
  };

  return batch;
};

type TeacherSloManagementProps = {
  teacherId: string;
  defaultAcademicYear: number;
  defaultTerm: TermLiteral;
};

const TeacherSloManagement = ({
  teacherId,
  defaultAcademicYear,
  defaultTerm,
}: TeacherSloManagementProps) => {
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [slos, setSlos] = useState<SloOption[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedSloId, setSelectedSloId] = useState<number | null>(null);
  const [records, setRecords] = useState<StudentRecordInput[]>([]);
  const [term, setTerm] = useState<TermLiteral>(defaultTerm);
  const [academicYear, setAcademicYear] = useState<number>(defaultAcademicYear);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isLoadingSlos, setIsLoadingSlos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [state, formAction] = useActionState(saveStudentSloRecords, {
    success: false,
    error: false,
  });

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoadingLessons(true);
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
        console.error("Error loading lessons for SLOs", error);
        toast.error("Error loading lessons");
      } finally {
        setIsLoadingLessons(false);
      }
    };

    if (teacherId) {
      void fetchLessons();
    }
  }, [teacherId]);

  useEffect(() => {
    const fetchSlos = async () => {
      setIsLoadingSlos(true);
      try {
        const response = await fetch("/api/cbc-slos");
        if (!response.ok) {
          toast.error("Error loading SLOs");
          return;
        }

        const json: unknown = await response.json();
        if (isSloOptionArray(json)) {
          setSlos(json);
        } else {
          toast.error("Unexpected SLO data received");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading SLOs", error);
        toast.error("Error loading SLOs");
      } finally {
        setIsLoadingSlos(false);
      }
    };

    void fetchSlos();
  }, []);

  useEffect(() => {
    if (state.success) {
      toast("SLO levels have been saved!");
      setIsSaving(false);
    } else if (state.error) {
      toast.error("Error saving SLO levels");
      setIsSaving(false);
    }
  }, [state]);

  const selectedLesson: TeacherLesson | undefined =
    selectedLessonId === null
      ? undefined
      : lessons.find((lesson) => lesson.id === selectedLessonId);

  const availableSlos: SloOption[] =
    selectedLesson === undefined ? slos : filterSlosForLesson(slos, selectedLesson);

  useEffect(() => {
    if (!selectedLesson) {
      setRecords([]);
      return;
    }

    const initialRecords: StudentRecordInput[] = selectedLesson.class.students.map(
      (student) => ({
        studentId: student.id,
        level: "APPROACHING_EXPECTATIONS",
        comment: "",
      }),
    );

    setRecords(initialRecords);
  }, [selectedLesson]);

  const handleLevelChange = (
    studentId: string,
    level: SloAchievementLevelLiteral,
  ) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.studentId === studentId ? { ...record, level } : record,
      ),
    );
  };

  const handleCommentChange = (studentId: string, comment: string) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.studentId === studentId ? { ...record, comment } : record,
      ),
    );
  };

  const handleSave = () => {
    if (!selectedLesson) {
      toast.error("Select a lesson");
      return;
    }

    if (selectedSloId === null) {
      toast.error("Select a specific learning outcome (SLO)");
      return;
    }

    if (records.length === 0) {
      toast.error("No students to save");
      return;
    }

    setIsSaving(true);

    const payload = mapToBatchPayload({
      term,
      academicYear,
      sloId: selectedSloId,
      lessonId: selectedLesson.id,
      records,
    });

    formAction(payload);
  };

  const isSaveDisabled =
    isSaving ||
    isLoadingLessons ||
    isLoadingSlos ||
    !selectedLesson ||
    selectedSloId === null ||
    records.length === 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-6">CBC SLO Recording</h2>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Academic year
          </label>
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={academicYear}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(value)) {
                setAcademicYear(value);
              }
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Term
          </label>
          <select
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={term}
            onChange={(event) => {
              const value = event.target.value as TermLiteral;
              setTerm(value);
            }}
          >
            {TERM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specific learning outcome (SLO)
          </label>
          <select
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedSloId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") {
                setSelectedSloId(null);
                return;
              }

              const parsed = Number.parseInt(value, 10);
              setSelectedSloId(Number.isNaN(parsed) ? null : parsed);
            }}
          >
            <option value="">Select SLO...</option>
            {availableSlos.map((slo) => {
              const labelParts: string[] = [];
              labelParts.push(slo.learningAreaName);
              labelParts.push(slo.strandName);
              labelParts.push(slo.subStrandName);
              const prefix = labelParts.join(" / ");
              const codePart = slo.code ? `${slo.code}: ` : "";
              return (
                <option key={slo.id} value={slo.id}>
                  {prefix} - {codePart}
                  {slo.description}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a lesson
        </label>
        <select
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={selectedLessonId ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "") {
              setSelectedLessonId(null);
              return;
            }
            const parsed = Number.parseInt(value, 10);
            setSelectedLessonId(Number.isNaN(parsed) ? null : parsed);
          }}
        >
          <option value="">Select a lesson...</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.subject.name} - {lesson.class.name} - {lesson.name}
            </option>
          ))}
        </select>
      </div>

      {selectedLesson && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {selectedLesson.subject.name} - {selectedLesson.class.name} students
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comment (optional)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedLesson.class.students.map((student, index) => {
                  const record = records.find(
                    (current) => current.studentId === student.id,
                  );

                  return (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.name} {student.surname}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          value={record?.level ?? "APPROACHING_EXPECTATIONS"}
                          onChange={(event) => {
                            const value =
                              event.target.value as SloAchievementLevelLiteral;
                            handleLevelChange(student.id, value);
                          }}
                        >
                          {SLO_LEVEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          value={record?.comment ?? ""}
                          onChange={(event) => {
                            handleCommentChange(student.id, event.target.value);
                          }}
                          placeholder="Optional comment"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save SLO levels"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSloManagement;
