import React from "react";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import { redirect } from "next/navigation";
import Announcements from "@/components/Announcements";
import LmsDashboardClient from "@/components/LmsDashboardClient";
import LmsTimetableCard from "@/components/LmsTimetableCard";
import { getCbcTermReport } from "@/lib/cbcReports";
import type { SerializedLearningArea, SerializedSloRow, SerializedEvidenceSummary } from "@/components/CbcLearningJourneyPanel";
import type { SerializedCompetencyRow, CbcCompetencyLiteral, CbcCompetencyLevelLiteral } from "@/components/CbcCompetencyPanel";

// ── Serialisable types for client boundary ────────────────────────────────
type SerializedLesson = {
    id: number;
    startTime: string;
    subjectName: string;
    teacherName: string;
};

type SerializedSubject = {
    id: number;
    name: string;
    teacherName: string;
    totalLessons: number;
    completedLessons: number;
    lastScore: number | null;
};

type SerializedAssignment = {
    id: number;
    title: string;
    dueDate: string;
    subjectName: string;
    submitted: boolean;
    score: number | null;
};

type SerializedExam = {
    id: number;
    title: string;
    startTime: string;
    subjectName: string;
};

const StudentLmsPage = async () => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) redirect("/sign-in");

    const { academicYear, term } = await getSchoolSettingsDefaults();

    // ── Student profile + class ───────────────────────────────────────────
    const student = await prisma.student.findUnique({
        where: { id: userId },
        include: {
            class: { select: { id: true, name: true } },
        },
    });

    const classId = student?.class?.id;
    const className = student?.class?.name ?? "";
    const studentName = student?.name ?? session?.user?.name ?? "Student";

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ── Today's timetable ─────────────────────────────────────────────────
    const todayLessons = classId
        ? await prisma.lesson.findMany({
            where: { classId, startTime: { gte: todayStart, lte: todayEnd } },
            include: {
                subject: { select: { name: true } },
                teacher: { select: { name: true, surname: true } },
            },
            orderBy: { startTime: "asc" },
        })
        : [];

    // ── Subjects via lessons (Subject has no `classes` relation) ─────────
    const subjectLessons = classId
        ? await prisma.lesson.findMany({
            where: { classId },
            select: {
                id: true,
                subject: {
                    select: {
                        id: true,
                        name: true,
                        teachers: { select: { name: true, surname: true }, take: 1 },
                    },
                },
                progress: { where: { studentId: userId }, select: { completed: true } },
            },
        })
        : [];

    // Group by subjectId, count total & completed lessons
    const subjectMap = new Map<
        number,
        {
            id: number;
            name: string;
            teacherName: string;
            totalLessons: number;
            completedLessons: number;
        }
    >();

    for (const lesson of subjectLessons) {
        const s = lesson.subject;
        const existing = subjectMap.get(s.id);
        const isCompleted = lesson.progress.some((p) => p.completed);

        if (existing) {
            existing.totalLessons += 1;
            if (isCompleted) existing.completedLessons += 1;
        } else {
            const teacher = s.teachers[0];
            subjectMap.set(s.id, {
                id: s.id,
                name: s.name,
                teacherName: teacher ? `${teacher.name} ${teacher.surname}` : "",
                totalLessons: 1,
                completedLessons: isCompleted ? 1 : 0,
            });
        }
    }

    const serializedSubjects: SerializedSubject[] = Array.from(subjectMap.values()).map(
        (s) => ({ ...s, lastScore: null }),
    );

    // ── Assignments ────────────────────────────────────────────────────────
    const assignments = classId
        ? await prisma.assignment.findMany({
            where: { lesson: { classId } },
            include: {
                lesson: { include: { subject: { select: { name: true } } } },
                submissions: {
                    where: { studentId: userId },
                    include: { result: { select: { score: true } } },
                },
            },
            orderBy: { dueDate: "asc" },
        })
        : [];

    const serializedAssignments: SerializedAssignment[] = assignments.map((a) => {
        const submission = a.submissions[0];
        return {
            id: a.id,
            title: a.title,
            dueDate: a.dueDate.toISOString(),
            subjectName: a.lesson.subject.name,
            submitted: !!submission,
            score: submission?.result?.score ?? null,
        };
    });

    // ── Results for average ────────────────────────────────────────────────
    const results = await prisma.result.findMany({
        where: { studentId: userId },
        select: { score: true },
        take: 50,
        orderBy: { id: "desc" },
    });

    const avgScore =
        results.length > 0
            ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
            : 0;

    // ── Upcoming exams ─────────────────────────────────────────────────────
    const upcomingExams = classId
        ? await prisma.exam.findMany({
            where: { lesson: { classId }, startTime: { gte: now } },
            include: { lesson: { include: { subject: { select: { name: true } } } } },
            orderBy: { startTime: "asc" },
            take: 5,
        })
        : [];

    const nextExamDays =
        upcomingExams.length > 0
            ? Math.ceil(
                (new Date(upcomingExams[0]!.startTime).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
            : null;

    // ── Attendance today ───────────────────────────────────────────────────
    const todayAttendance = await prisma.attendance.findFirst({
        where: { studentId: userId, date: { gte: todayStart, lte: todayEnd } },
        select: { present: true, date: true },
    });

    // ── Serialise ──────────────────────────────────────────────────────────
    const serializedLessons: SerializedLesson[] = todayLessons.map((l) => ({
        id: l.id,
        startTime: l.startTime.toISOString(),
        subjectName: l.subject.name,
        teacherName: `${l.teacher.name} ${l.teacher.surname}`,
    }));

    const serializedExams: SerializedExam[] = upcomingExams.map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime.toISOString(),
        subjectName: e.lesson.subject.name,
    }));

    const assignmentsDueCount = assignments.filter((a) => {
        const due = new Date(a.dueDate);
        return a.submissions.length === 0 && due >= now;
    }).length;

    // ── CBC Term Report ────────────────────────────────────────────────────
    const cbcReport = await getCbcTermReport({
        studentId: userId,
        academicYear: academicYear ?? new Date().getFullYear(),
        term: (term ?? "TERM1") as "TERM1" | "TERM2" | "TERM3",
    });

    // Serialise CBC learning areas
    const serializedLearningAreas: SerializedLearningArea[] =
        cbcReport?.learningAreas.map((area) => ({
            learningAreaName: area.learningAreaName,
            slos: area.slos.map((slo): SerializedSloRow => {
                const evidence: SerializedEvidenceSummary = {
                    observationCount: slo.evidence.observationCount,
                    lastObservationNote: slo.evidence.lastObservationNote,
                };
                return {
                    sloId: slo.sloId,
                    sloCode: slo.sloCode,
                    sloDescription: slo.sloDescription,
                    strandName: slo.strandName,
                    subStrandName: slo.subStrandName,
                    level: slo.level as SerializedSloRow["level"],
                    comment: slo.comment,
                    evidence,
                };
            }),
        })) ?? [];

    // Serialise CBC competencies
    const serializedCompetencies: SerializedCompetencyRow[] =
        cbcReport?.competencies.map((row): SerializedCompetencyRow => ({
            competency: row.competency as CbcCompetencyLiteral,
            level: row.level as CbcCompetencyLevelLiteral,
            comment: row.comment,
            observationCount: row.evidence.observationCount,
        })) ?? [];

    // Compute summary stats for the hero section
    const allSlos = serializedLearningAreas.flatMap((a) => a.slos);
    const totalSloCount = allSlos.length;
    const meetingSloCount = allSlos.filter((s) => s.level === "MEETING_EXPECTATIONS").length;
    const sloMeetingPct =
        totalSloCount > 0 ? Math.round((meetingSloCount / totalSloCount) * 100) : 0;

    // Strongest ↔ highest level competency; Focus ↔ any EMERGING
    const LEVEL_RANK: Record<CbcCompetencyLevelLiteral, number> = {
        EMERGING: 1, DEVELOPING: 2, PROFICIENT: 3, ADVANCED: 4,
    };
    const COMPETENCY_LABELS: Record<CbcCompetencyLiteral, string> = {
        COMMUNICATION_COLLABORATION: "Communication & Collaboration",
        CRITICAL_THINKING_PROBLEM_SOLVING: "Critical Thinking & Problem Solving",
        IMAGINATION_CREATIVITY: "Imagination & Creativity",
        CITIZENSHIP: "Citizenship",
        DIGITAL_LITERACY: "Digital Literacy",
        LEARNING_TO_LEARN: "Learning to Learn",
        SELF_EFFICACY: "Self-Efficacy",
    };

    const sortedByLevel = [...serializedCompetencies].sort(
        (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level],
    );
    const strongestCompetency: string | null =
        sortedByLevel[0] ? COMPETENCY_LABELS[sortedByLevel[0].competency] : null;
    const emergingRows = sortedByLevel.filter((r) => r.level === "EMERGING");
    const focusCompetency: string | null =
        emergingRows[0] ? COMPETENCY_LABELS[emergingRows[0].competency] : null;

    return (
        <div className="flex flex-col xl:flex-row gap-4 p-4">
            {/* Main LMS Content */}
            <div className="w-full xl:w-2/3 flex flex-col gap-4">
                <LmsDashboardClient
                    studentName={studentName}
                    className={className}
                    term={term ?? "Term 1"}
                    academicYear={academicYear ?? 2026}
                    attendancePresent={todayAttendance?.present ?? null}
                    attendanceTime={todayAttendance?.date?.toISOString() ?? null}
                    subjectsCount={serializedSubjects.length}
                    assignmentsDueCount={assignmentsDueCount}
                    avgScore={avgScore}
                    nextExamDays={nextExamDays}
                    subjects={serializedSubjects}
                    assignments={serializedAssignments}
                    cbcLearningAreas={serializedLearningAreas}
                    cbcCompetencies={serializedCompetencies}
                    sloMeetingPct={sloMeetingPct}
                    strongestCompetency={strongestCompetency}
                    focusCompetency={focusCompetency}
                />
            </div>

            {/* Right Sidebar */}
            <div className="w-full xl:w-1/3 flex flex-col gap-4">
                <LmsTimetableCard lessons={serializedLessons} />

                {/* Upcoming Assessments */}
                <div className="bg-white rounded-md p-4">
                    <h2 className="font-semibold text-gray-800 mb-3">📌 Upcoming Assessments</h2>
                    {serializedExams.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No upcoming exams scheduled.</p>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {serializedExams.map((exam) => {
                                const days = Math.ceil(
                                    (new Date(exam.startTime).getTime() - now.getTime()) /
                                    (1000 * 60 * 60 * 24),
                                );
                                return (
                                    <div
                                        key={exam.id}
                                        className="flex items-center justify-between border-b last:border-0 py-2 text-sm"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-700">{exam.title}</div>
                                            <div className="text-xs text-gray-400">{exam.subjectName}</div>
                                        </div>
                                        <span
                                            className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 3
                                                ? "bg-red-100 text-red-600"
                                                : days <= 7
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            {days}d
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <Announcements />
            </div>
        </div>
    );
};

export default StudentLmsPage;
