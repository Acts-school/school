"use client";

import React, { useState } from "react";
import Link from "next/link";

import CbcLearningJourneyPanel from "@/components/CbcLearningJourneyPanel";
import CbcCompetencyPanel from "@/components/CbcCompetencyPanel";
import type { SerializedLearningArea } from "@/components/CbcLearningJourneyPanel";
import type { SerializedCompetencyRow } from "@/components/CbcCompetencyPanel";

// ─── Types ────────────────────────────────────────────────────────────────

type Subject = {
    id: number;
    name: string;
    teacherName: string;
    totalLessons: number;
    completedLessons: number;
    lastScore: number | null;
};

type Assignment = {
    id: number;
    title: string;
    dueDate: string;
    subjectName: string;
    submitted: boolean;
    score: number | null;
};

type LmsDashboardClientProps = {
    studentName: string;
    className: string;
    term: string;
    academicYear: number;
    attendancePresent: boolean | null;
    attendanceTime: string | null;
    subjectsCount: number;
    assignmentsDueCount: number;
    avgScore: number;
    nextExamDays: number | null;
    subjects: Subject[];
    assignments: Assignment[];
    // CBC enhancement props (optional — dashboard degrades gracefully without them)
    cbcLearningAreas?: SerializedLearningArea[];
    cbcCompetencies?: SerializedCompetencyRow[];
    sloMeetingPct?: number;
    strongestCompetency?: string | null;
    focusCompetency?: string | null;
};

// ─── Subject accent colors (cycling) ─────────────────────────────────────
const SUBJECT_COLORS = [
    "border-l-blue-400 bg-blue-50",
    "border-l-purple-400 bg-purple-50",
    "border-l-yellow-400 bg-yellow-50",
    "border-l-green-400 bg-green-50",
    "border-l-red-400 bg-red-50",
    "border-l-indigo-400 bg-indigo-50",
];

const SUBJECT_PROGRESS_COLORS = [
    "bg-blue-400",
    "bg-purple-400",
    "bg-yellow-400",
    "bg-green-400",
    "bg-red-400",
    "bg-indigo-400",
];

// ─── Pre-Primary UI ───────────────────────────────────────────────────────

const ACTIVITIES = [
    { icon: "🎨", label: "Art & Drawing", color: "bg-red-100 border-red-200" },
    { icon: "📖", label: "Story Time", color: "bg-yellow-100 border-yellow-200" },
    { icon: "🔢", label: "Counting Game", color: "bg-green-100 border-green-200" },
    { icon: "🎵", label: "Music & Songs", color: "bg-blue-100 border-blue-200" },
];

const PrePrimaryDashboard = ({ studentName }: { studentName: string }) => (
    <div className="flex flex-col gap-6">
        <div className="bg-gradient-to-r from-yellow-100 to-pink-100 rounded-2xl p-5">
            <h1 className="text-2xl font-bold text-gray-700">🌈 Hi, {studentName.split(" ")[0]}!</h1>
            <p className="text-gray-500 text-sm mt-1">Ready for today&apos;s fun activities?</p>
        </div>

        <div>
            <h2 className="font-semibold text-lg text-gray-700 mb-3">🌟 Today&apos;s Activities</h2>
            <div className="grid grid-cols-2 gap-3">
                {ACTIVITIES.map((activity) => (
                    <div key={activity.label} className={`${activity.color} border-2 rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow`}>
                        <span className="text-4xl">{activity.icon}</span>
                        <span className="font-semibold text-gray-700 text-center text-sm">{activity.label}</span>
                        <button className="mt-1 bg-white text-gray-600 text-xs font-semibold px-4 py-1.5 rounded-full border hover:bg-gray-100 transition">
                            Start ▶
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-yellow-200">
            <h2 className="font-semibold text-gray-700 mb-1">⭐ My Stars Today</h2>
            <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-2xl">⭐</span>
                ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Keep going to earn more stars!</p>
        </div>
    </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────

const LmsDashboardClient = ({
    studentName,
    className,
    term,
    academicYear,
    attendancePresent,
    attendanceTime,
    subjectsCount,
    assignmentsDueCount,
    avgScore,
    nextExamDays,
    subjects,
    assignments,
    cbcLearningAreas,
    cbcCompetencies,
    sloMeetingPct,
    strongestCompetency,
    focusCompetency,
}: LmsDashboardClientProps) => {
    const [assignmentTab, setAssignmentTab] = useState<"today" | "week" | "done">("today");

    const isPrePrimary = /^(PP|KG|ECD|Pre)/i.test(className);
    if (isPrePrimary) return <PrePrimaryDashboard studentName={studentName} />;

    const now = new Date();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    const dueToday = assignments.filter(
        (a) => !a.submitted && new Date(a.dueDate) <= todayEnd && new Date(a.dueDate) >= now,
    );
    const dueThisWeek = assignments.filter(
        (a) =>
            !a.submitted &&
            new Date(a.dueDate) > todayEnd &&
            new Date(a.dueDate) <= weekEnd,
    );
    const completed = assignments.filter((a) => a.submitted);

    const activeAssignments =
        assignmentTab === "today"
            ? dueToday
            : assignmentTab === "week"
                ? dueThisWeek
                : completed;

    const snapshotCards = [
        {
            label: "Subjects This Term",
            value: subjectsCount,
            suffix: "",
            icon: "📚",
            bg: "bg-lamaSkyLight",
            iconBg: "bg-lamaSky",
        },
        {
            label: "Assignments Due",
            value: assignmentsDueCount,
            suffix: "",
            icon: "📝",
            bg: "bg-lamaYellowLight",
            iconBg: "bg-lamaYellow",
        },
        {
            label: "Average Score",
            value: avgScore,
            suffix: "%",
            icon: "📊",
            bg: "bg-lamaPurpleLight",
            iconBg: "bg-lamaPurple",
        },
        {
            label: "Next Exam",
            value: nextExamDays ?? "—",
            suffix: nextExamDays !== null ? " days" : "",
            icon: "⏳",
            bg: "bg-lamaGreenLight",
            iconBg: "text-green-600",
        },
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="bg-white rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        👋 Hi, {studentName.split(" ")[0]}!
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {className} &nbsp;·&nbsp; {term} &nbsp;·&nbsp; {academicYear} Academic Year
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {attendancePresent === true && (
                        <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            Present
                            {attendanceTime && (
                                <span className="text-green-500 ml-0.5">
                                    · {new Date(attendanceTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            )}
                        </span>
                    )}
                    {attendancePresent === false && (
                        <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-full font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                            Absent Today
                        </span>
                    )}
                    {attendancePresent === null && (
                        <span className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full font-medium">
                            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                            Not checked in
                        </span>
                    )}
                </div>
            </div>

            {/* ── Academic Snapshot (shown always for evidence context) ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {snapshotCards.map((card) => (
                    <div key={card.label} className={`${card.bg} rounded-md p-4 flex flex-col gap-2`}>
                        <span className="text-xl">{card.icon}</span>
                        <div className="text-2xl font-bold text-gray-800">
                            {card.value}
                            <span className="text-sm font-medium text-gray-500">{card.suffix}</span>
                        </div>
                        <div className="text-xs text-gray-500 leading-tight">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* ── CBC Learning Journey ──────────────────────────────────── */}
            {cbcLearningAreas !== undefined && (
                <CbcLearningJourneyPanel
                    learningAreas={cbcLearningAreas}
                    sloMeetingPct={sloMeetingPct ?? 0}
                    strongestCompetency={strongestCompetency ?? null}
                    focusCompetency={focusCompetency ?? null}
                    studentFirstName={studentName.split(" ")[0] ?? studentName}
                    term={term}
                />
            )}

            {/* ── CBC Competency Panel ──────────────────────────────────── */}
            {cbcCompetencies !== undefined && (
                <CbcCompetencyPanel competencies={cbcCompetencies} />
            )}

            {/* ── My Subjects ───────────────────────────────────────── */}
            <div className="bg-white rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-800 text-lg">📖 My Subjects</h2>
                </div>
                {subjects.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-6">
                        No subjects assigned yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subjects.map((subject, idx) => {
                            const pct =
                                subject.totalLessons > 0
                                    ? Math.round((subject.completedLessons / subject.totalLessons) * 100)
                                    : 0;
                            const colorClass = SUBJECT_COLORS[idx % SUBJECT_COLORS.length]!;
                            const progressColor = SUBJECT_PROGRESS_COLORS[idx % SUBJECT_PROGRESS_COLORS.length]!;

                            return (
                                <div
                                    key={subject.id}
                                    className={`border-l-4 ${colorClass} rounded-md p-3 flex flex-col gap-2`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                                            {subject.teacherName && (
                                                <p className="text-xs text-gray-400">{subject.teacherName}</p>
                                            )}
                                        </div>
                                        {subject.lastScore !== null && (
                                            <span className="text-xs font-semibold bg-white px-2 py-0.5 rounded-full border text-gray-600">
                                                {subject.lastScore}%
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>{subject.completedLessons} / {subject.totalLessons} lessons</span>
                                            <span>{pct}%</span>
                                        </div>
                                        <div className="w-full bg-white rounded-full h-1.5 border">
                                            <div
                                                className={`${progressColor} h-1.5 rounded-full transition-all duration-500`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    <Link
                                        href={`/list/subjects/${subject.id}/viewer`}
                                        className="text-xs font-semibold text-lamaSky hover:underline self-start mt-1"
                                    >
                                        Continue →
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Homework & Assessments ───────────────────────────── */}
            <div className="bg-white rounded-md p-4">
                <h2 className="font-semibold text-gray-800 text-lg mb-3">📝 Homework &amp; Assessments</h2>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    {(
                        [
                            { key: "today", label: `Due Today (${dueToday.length})`, dotColor: "bg-red-400" },
                            { key: "week", label: `This Week (${dueThisWeek.length})`, dotColor: "bg-yellow-400" },
                            { key: "done", label: `Completed (${completed.length})`, dotColor: "bg-green-400" },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setAssignmentTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${assignmentTab === tab.key
                                ? "bg-gray-800 text-white"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${tab.dotColor}`}></span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Assignment list */}
                {activeAssignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic text-sm">
                        {assignmentTab === "today"
                            ? "🎉 Nothing due today!"
                            : assignmentTab === "week"
                                ? "Nothing due this week."
                                : "No completed assignments yet."}
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                        {activeAssignments.map((a) => {
                            const due = new Date(a.dueDate);
                            const isOverdue = !a.submitted && due < now;
                            return (
                                <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${a.submitted ? "bg-green-100" : isOverdue ? "bg-red-100" : "bg-yellow-100"
                                            }`}>
                                            <span className="text-base">{a.submitted ? "✅" : isOverdue ? "🔴" : "📋"}</span>
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm text-gray-800">{a.title}</div>
                                            <div className="text-xs text-gray-400">
                                                {a.subjectName} &nbsp;·&nbsp;{" "}
                                                {due.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                                                {" "}at {due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {a.score !== null && (
                                            <span className="text-sm font-bold text-gray-600">{a.score}%</span>
                                        )}
                                        {a.submitted ? (
                                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                                                Submitted
                                            </span>
                                        ) : isOverdue ? (
                                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">
                                                Overdue
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LmsDashboardClient;
