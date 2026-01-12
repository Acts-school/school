"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import type { TermLiteral } from "@/lib/schoolSettings";

type LessonStudent = {
  id: string;
  name: string;
  surname: string;
};

type TeacherAssignment = {
  id: number;
  title: string;
  startDate: string;
  dueDate: string;
  lesson: {
    id: number;
    name: string;
    day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
    subject: {
      name: string;
    };
    class: {
      name: string;
      students: LessonStudent[];
    };
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

type RubricCriterion = {
  id: number;
  level: "BELOW_EXPECTATIONS" | "APPROACHING_EXPECTATIONS" | "MEETING_EXPECTATIONS";
  descriptor: string;
};

type RubricOption = {
  id: number;
  name: string;
  description: string | null;
  stage: string;
  gradeLevel: number;
  criteria: RubricCriterion[];
};

type StudentMarkInput = {
  studentId: string;
  rubricCriterionId: number | null;
  comment: string;
};

const isTeacherAssignmentArray = (data: unknown): data is TeacherAssignment[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const assignment = item as {
      id?: unknown;
      title?: unknown;
      startDate?: unknown;
      dueDate?: unknown;
      lesson?: unknown;
    };

    if (
      typeof assignment.id !== "number" ||
      typeof assignment.title !== "string" ||
      typeof assignment.startDate !== "string" ||
      typeof assignment.dueDate !== "string"
    ) {
      return false;
    }

    const lesson = assignment.lesson as {
      id?: unknown;
      name?: unknown;
      day?: unknown;
      subject?: unknown;
      class?: unknown;
    } | null;

    if (!lesson || typeof lesson.id !== "number" || typeof lesson.name !== "string") {
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

const isRubricOptionArray = (data: unknown): data is RubricOption[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const rubric = item as {
      id?: unknown;
      name?: unknown;
      description?: unknown;
      stage?: unknown;
      gradeLevel?: unknown;
      criteria?: unknown;
    };

    if (
      typeof rubric.id !== "number" ||
      typeof rubric.name !== "string" ||
      typeof rubric.stage !== "string" ||
      typeof rubric.gradeLevel !== "number"
    ) {
      return false;
    }

    if (rubric.description !== null && rubric.description !== undefined) {
      if (typeof rubric.description !== "string") {
        return false;
      }
    }

    if (!Array.isArray(rubric.criteria)) {
      return false;
    }

    return rubric.criteria.every((c) => {
      if (typeof c !== "object" || c === null) {
        return false;
      }

      const criterion = c as {
        id?: unknown;
        level?: unknown;
        descriptor?: unknown;
      };

      if (typeof criterion.id !== "number") {
        return false;
      }

      if (
        criterion.level !== "BELOW_EXPECTATIONS" &&
        criterion.level !== "APPROACHING_EXPECTATIONS" &&
        criterion.level !== "MEETING_EXPECTATIONS"
      ) {
        return false;
      }

      return typeof criterion.descriptor === "string";
    });
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
      subject.includes(pair.subjectKeyword) &&
      learningArea.includes(pair.learningAreaKeyword)
    );
  });
};

const filterSlosForLesson = (slos: SloOption[], assignment: TeacherAssignment): SloOption[] => {
  const subjectName = assignment.lesson.subject.name;

  const matching = slos.filter((slo) =>
    sloMatchesLessonSubject({ subjectName, learningAreaName: slo.learningAreaName }),
  );

  if (matching.length > 0) {
    return matching;
  }

  return slos;
};

const TeacherTaskRubricMarking = ({
  teacherId,
  defaultAcademicYear,
  defaultTerm,
}: {
  teacherId: string;
  defaultAcademicYear: number;
  defaultTerm: TermLiteral;
}) => {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [slos, setSlos] = useState<SloOption[]>([]);
  const [rubrics, setRubrics] = useState<RubricOption[]>([]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedSloId, setSelectedSloId] = useState<number | null>(null);
  const [selectedRubricId, setSelectedRubricId] = useState<number | null>(null);
  const [studentMarks, setStudentMarks] = useState<StudentMarkInput[]>([]);

  const [academicYear] = useState<number>(defaultAcademicYear);
  const [term] = useState<TermLiteral>(defaultTerm);

  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingSlos, setIsLoadingSlos] = useState(false);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      try {
        const response = await fetch(`/api/teacher-assignments?teacherId=${teacherId}`);
        if (!response.ok) {
          toast.error("Error loading assignments");
          return;
        }

        const json: unknown = await response.json();
        if (isTeacherAssignmentArray(json)) {
          setAssignments(json);
        } else {
          toast.error("Unexpected assignment data received");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading teacher assignments", error);
        toast.error("Error loading assignments");
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    if (teacherId) {
      void fetchAssignments();
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
        console.error("Error loading SLOs for tasks", error);
        toast.error("Error loading SLOs");
      } finally {
        setIsLoadingSlos(false);
      }
    };

    void fetchSlos();
  }, []);

  useEffect(() => {
    const fetchRubrics = async () => {
      setIsLoadingRubrics(true);
      try {
        const response = await fetch("/api/cbc-rubrics");
        if (!response.ok) {
          toast.error("Error loading rubrics");
          return;
        }

        const json: unknown = await response.json();
        if (isRubricOptionArray(json)) {
          setRubrics(json);
        } else {
          toast.error("Unexpected rubric data received");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading rubrics", error);
        toast.error("Error loading rubrics");
      } finally {
        setIsLoadingRubrics(false);
      }
    };

    void fetchRubrics();
  }, []);

  const selectedAssignment: TeacherAssignment | undefined = useMemo(
    () =>
      selectedAssignmentId === null
        ? undefined
        : assignments.find((assignment) => assignment.id === selectedAssignmentId),
    [assignments, selectedAssignmentId],
  );

  const availableSlos: SloOption[] = useMemo(() => {
    if (!selectedAssignment) {
      return slos;
    }

    return filterSlosForLesson(slos, selectedAssignment);
  }, [slos, selectedAssignment]);

  const availableRubrics: RubricOption[] = rubrics;

  useEffect(() => {
    if (!selectedAssignment) {
      setStudentMarks([]);
      return;
    }

    const initialMarks: StudentMarkInput[] = selectedAssignment.lesson.class.students.map(
      (student) => ({
        studentId: student.id,
        rubricCriterionId: null,
        comment: "",
      }),
    );

    setStudentMarks(initialMarks);
  }, [selectedAssignment]);

  const handleCriterionChange = (studentId: string, rubricCriterionId: number | null) => {
    setStudentMarks((prev) =>
      prev.map((entry) =>
        entry.studentId === studentId ? { ...entry, rubricCriterionId } : entry,
      ),
    );
  };

  const handleCommentChange = (studentId: string, comment: string) => {
    setStudentMarks((prev) =>
      prev.map((entry) =>
        entry.studentId === studentId ? { ...entry, comment } : entry,
      ),
    );
  };

  const handleSave = async () => {
    if (!selectedAssignment) {
      toast.error("Select an assignment");
      return;
    }

    if (selectedSloId === null) {
      toast.error("Select a specific learning outcome (SLO)");
      return;
    }

    if (selectedRubricId === null) {
      toast.error("Select a rubric");
      return;
    }

    const incomplete = studentMarks.some((entry) => entry.rubricCriterionId === null);
    if (incomplete) {
      toast.error("Select a rubric level for each student");
      return;
    }

    if (studentMarks.length === 0) {
      toast.error("No students to save");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        assignmentId: selectedAssignment.id,
        sloId: selectedSloId,
        rubricId: selectedRubricId,
        records: studentMarks.map((entry) => ({
          studentId: entry.studentId,
          rubricCriterionId: entry.rubricCriterionId as number,
          comment: entry.comment === "" ? undefined : entry.comment,
        })),
      };

      const response = await fetch("/api/cbc-task-marks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to save task marks";
        try {
          const data = (await response.json()) as { error?: unknown };
          if (typeof data.error === "string" && data.error.length > 0) {
            message = data.error;
          }
        } catch {
          // ignore parse errors
        }
        toast.error(message);
        setIsSaving(false);
        return;
      }

      toast("Task observations have been saved!");
      setIsSaving(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error saving CBC task marks", error);
      toast.error("Error saving task marks");
      setIsSaving(false);
    }
  };

  const isSaveDisabled =
    isSaving ||
    isLoadingAssignments ||
    isLoadingSlos ||
    isLoadingRubrics ||
    !selectedAssignment ||
    selectedSloId === null ||
    selectedRubricId === null ||
    studentMarks.length === 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-6">CBC Task Rubric Marking</h2>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Academic year
          </label>
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={academicYear}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={term}
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assignment
          </label>
          <select
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedAssignmentId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") {
                setSelectedAssignmentId(null);
                return;
              }

              const parsed = Number.parseInt(value, 10);
              setSelectedAssignmentId(Number.isNaN(parsed) ? null : parsed);
            }}
          >
            <option value="">Select assignment...</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title} - {assignment.lesson.subject.name} - {assignment.lesson.class.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rubric</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedRubricId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") {
                setSelectedRubricId(null);
                return;
              }

              const parsed = Number.parseInt(value, 10);
              setSelectedRubricId(Number.isNaN(parsed) ? null : parsed);
            }}
          >
            <option value="">Select rubric...</option>
            {availableRubrics.map((rubric) => (
              <option key={rubric.id} value={rubric.id}>
                {rubric.name} ({rubric.stage} G{rubric.gradeLevel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedAssignment && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {selectedAssignment.lesson.subject.name} - {selectedAssignment.lesson.class.name} students
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
                    Rubric level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comment (optional)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedAssignment.lesson.class.students.map((student, index) => {
                  const mark = studentMarks.find((entry) => entry.studentId === student.id);

                  const rubric =
                    selectedRubricId === null
                      ? undefined
                      : availableRubrics.find((r) => r.id === selectedRubricId);

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
                          value={mark?.rubricCriterionId ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === "") {
                              handleCriterionChange(student.id, null);
                              return;
                            }

                            const parsed = Number.parseInt(value, 10);
                            handleCriterionChange(
                              student.id,
                              Number.isNaN(parsed) ? null : parsed,
                            );
                          }}
                          disabled={!rubric}
                        >
                          <option value="">Select level...</option>
                          {rubric?.criteria.map((criterion) => (
                            <option key={criterion.id} value={criterion.id}>
                              {criterion.level.replace("_", " ")} - {criterion.descriptor}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          value={mark?.comment ?? ""}
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
              {isSaving ? "Saving..." : "Save task observations"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherTaskRubricMarking;
