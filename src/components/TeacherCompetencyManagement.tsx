"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { saveStudentCompetencies } from "@/lib/actions";
import type { TermLiteral } from "@/lib/schoolSettings";
import type { StudentCompetencyBatchSchema } from "@/lib/formValidationSchemas";

type CbcCompetencyLiteral =
  | "COMMUNICATION_COLLABORATION"
  | "CRITICAL_THINKING_PROBLEM_SOLVING"
  | "IMAGINATION_CREATIVITY"
  | "CITIZENSHIP"
  | "DIGITAL_LITERACY"
  | "LEARNING_TO_LEARN"
  | "SELF_EFFICACY";

type CbcCompetencyLevelLiteral =
  | "EMERGING"
  | "DEVELOPING"
  | "PROFICIENT"
  | "ADVANCED";

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

type StudentRecordInput = {
  studentId: string;
  level: CbcCompetencyLevelLiteral;
  comment: string;
};

const CBC_COMPETENCY_OPTIONS: { value: CbcCompetencyLiteral; label: string }[] = [
  {
    value: "COMMUNICATION_COLLABORATION",
    label: "Communication & Collaboration",
  },
  {
    value: "CRITICAL_THINKING_PROBLEM_SOLVING",
    label: "Critical Thinking & Problem Solving",
  },
  { value: "IMAGINATION_CREATIVITY", label: "Imagination & Creativity" },
  { value: "CITIZENSHIP", label: "Citizenship" },
  { value: "DIGITAL_LITERACY", label: "Digital Literacy" },
  { value: "LEARNING_TO_LEARN", label: "Learning to Learn" },
  { value: "SELF_EFFICACY", label: "Self-Efficacy" },
];

const CBC_LEVEL_OPTIONS: { value: CbcCompetencyLevelLiteral; label: string }[] = [
  { value: "EMERGING", label: "Emerging" },
  { value: "DEVELOPING", label: "Developing" },
  { value: "PROFICIENT", label: "Proficient" },
  { value: "ADVANCED", label: "Advanced" },
];

const TERM_OPTIONS: { value: TermLiteral; label: string }[] = [
  { value: "TERM1", label: "Term 1" },
  { value: "TERM2", label: "Term 2" },
  { value: "TERM3", label: "Term 3" },
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

const mapToBatchPayload = (
  args: {
    term: TermLiteral;
    academicYear: number;
    competency: CbcCompetencyLiteral;
    lessonId: number;
    records: StudentRecordInput[];
  },
): StudentCompetencyBatchSchema => {
  const { term, academicYear, competency, lessonId, records } = args;

  const batch: StudentCompetencyBatchSchema = {
    term,
    academicYear,
    competency,
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

type TeacherCompetencyManagementProps = {
  teacherId: string;
  defaultAcademicYear: number;
  defaultTerm: TermLiteral;
};

const TeacherCompetencyManagement = ({
  teacherId,
  defaultAcademicYear,
  defaultTerm,
}: TeacherCompetencyManagementProps) => {
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [records, setRecords] = useState<StudentRecordInput[]>([]);
  const [term, setTerm] = useState<TermLiteral>(defaultTerm);
  const [academicYear, setAcademicYear] = useState<number>(defaultAcademicYear);
  const [competency, setCompetency] = useState<CbcCompetencyLiteral | "">("");
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [state, formAction] = useActionState(saveStudentCompetencies, {
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
        console.error("Error loading lessons for competencies", error);
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
    if (state.success) {
      toast("Competencies have been saved!");
      setIsSaving(false);
    } else if (state.error) {
      toast.error("Error saving competencies");
      setIsSaving(false);
    }
  }, [state]);

  const selectedLesson: TeacherLesson | undefined =
    selectedLessonId === null
      ? undefined
      : lessons.find((lesson) => lesson.id === selectedLessonId);

  useEffect(() => {
    if (!selectedLesson) {
      setRecords([]);
      return;
    }

    const initialRecords: StudentRecordInput[] = selectedLesson.class.students.map(
      (student) => ({
        studentId: student.id,
        level: "DEVELOPING",
        comment: "",
      }),
    );

    setRecords(initialRecords);
  }, [selectedLesson]);

  const handleLevelChange = (
    studentId: string,
    level: CbcCompetencyLevelLiteral,
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

    if (competency === "") {
      toast.error("Select a competency");
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
      competency,
      lessonId: selectedLesson.id,
      records,
    });

    formAction(payload);
  };

  const isSaveDisabled =
    isSaving ||
    isLoadingLessons ||
    !selectedLesson ||
    competency === "" ||
    records.length === 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-6">CBC Competency Recording</h2>

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
            Competency
          </label>
          <select
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={competency}
            onChange={(event) => {
              const value = event.target.value as CbcCompetencyLiteral | "";
              setCompetency(value);
            }}
          >
            <option value="">Select competency...</option>
            {CBC_COMPETENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
                          value={record?.level ?? "DEVELOPING"}
                          onChange={(event) => {
                            const value =
                              event.target.value as CbcCompetencyLevelLiteral;
                            handleLevelChange(student.id, value);
                          }}
                        >
                          {CBC_LEVEL_OPTIONS.map((option) => (
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
              {isSaving ? "Saving..." : "Save competencies"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherCompetencyManagement;
