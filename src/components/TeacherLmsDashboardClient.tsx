"use client";

import React, { useState } from "react";
import Link from "next/link";

import TeacherTodayLessons from "@/components/TeacherTodayLessons";
import TeacherSloManagement from "@/components/TeacherSloManagement";
import TeacherCompetencyManagement from "@/components/TeacherCompetencyManagement";
import TeacherTaskRubricMarking from "@/components/TeacherTaskRubricMarking";
import type { TermLiteral } from "@/lib/schoolSettings";

// ─── Types ────────────────────────────────────────────────────────────────

export type TeacherLmsDashboardClientProps = {
    teacherId: string;
    teacherName: string;
    term: TermLiteral;
    academicYear: number;
    defaultAcademicYear: number;
    defaultTerm: TermLiteral;
};

type TabKey =
    | "today"
    | "slo"
    | "competencies"
    | "tasks"
    | "analytics"
    | "virtual";

type Tab = {
    key: TabKey;
    label: string;
    icon: string;
    description: string;
};

// ─── Constants ────────────────────────────────────────────────────────────

const TABS: Tab[] = [
    {
        key: "today",
        label: "Teaching Today",
        icon: "📅",
        description: "Today's lessons + quick observations",
    },
    {
        key: "slo",
        label: "Map SLOs",
        icon: "🎯",
        description: "Record Specific Learning Outcomes per student",
    },
    {
        key: "competencies",
        label: "Competencies",
        icon: "📊",
        description: "Record the 7 CBC core competencies",
    },
    {
        key: "tasks",
        label: "Task Rubrics",
        icon: "📝",
        description: "Rubric-based task and assignment marking",
    },
    {
        key: "analytics",
        label: "CBC Analytics",
        icon: "📈",
        description: "Class-level SLO and competency summary",
    },
    {
        key: "virtual",
        label: "Virtual Class",
        icon: "🎥",
        description: "Online class management (coming soon)",
    },
];

const TERM_LABELS: Record<TermLiteral, string> = {
    TERM1: "Term 1",
    TERM2: "Term 2",
    TERM3: "Term 3",
};

// ─── Quick Action Cards ───────────────────────────────────────────────────

type QuickAction = {
    icon: string;
    label: string;
    purpose: string;
    cbcLabel: string;
    href: string | null;
    tab: TabKey | null;
    accentBg: string;
    accentText: string;
};

const QUICK_ACTIONS: QuickAction[] = [
    {
        icon: "📚",
        label: "Create Lesson",
        purpose: "Create a structured CBC lesson",
        cbcLabel: "Tied to Strand / Sub-Strand",
        href: "/list/lessons",
        tab: null,
        accentBg: "bg-blue-50",
        accentText: "text-blue-600",
    },
    {
        icon: "🎯",
        label: "Map SLOs",
        purpose: "Attach SLOs to a lesson",
        cbcLabel: "Specific Learning Outcomes",
        href: null,
        tab: "slo",
        accentBg: "bg-purple-50",
        accentText: "text-purple-600",
    },
    {
        icon: "📝",
        label: "Create Assignment",
        purpose: "Formative assessment",
        cbcLabel: "Evidence for SLOs",
        href: "/list/assignments",
        tab: null,
        accentBg: "bg-yellow-50",
        accentText: "text-yellow-600",
    },
    {
        icon: "📊",
        label: "Record Competencies",
        purpose: "Update 7 core competencies",
        cbcLabel: "CBC Core Competencies",
        href: null,
        tab: "competencies",
        accentBg: "bg-green-50",
        accentText: "text-green-600",
    },
    {
        icon: "✏️",
        label: "Mark Tasks",
        purpose: "Rubric-based task marking",
        cbcLabel: "Assessment Evidence",
        href: null,
        tab: "tasks",
        accentBg: "bg-orange-50",
        accentText: "text-orange-600",
    },
    {
        icon: "📄",
        label: "CBC Report",
        purpose: "View or print term reports",
        cbcLabel: "Term Report Generation",
        href: "/teacher/cbc-reports",
        tab: null,
        accentBg: "bg-indigo-50",
        accentText: "text-indigo-600",
    },
];

// ─── CBC Analytics Panel ──────────────────────────────────────────────────

const CbcAnalyticsPanel = () => (
    <div className="flex flex-col gap-6">
        <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="font-semibold text-gray-800 mb-4 text-base">
                📊 Class Assessment Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(
                    [
                        {
                            label: "Meeting Expectations",
                            color: "bg-green-100 text-green-700 border-green-200",
                            icon: "✅",
                        },
                        {
                            label: "Approaching Expectations",
                            color: "bg-yellow-100 text-yellow-700 border-yellow-200",
                            icon: "⚠️",
                        },
                        {
                            label: "Below Expectations",
                            color: "bg-red-100 text-red-700 border-red-200",
                            icon: "🔴",
                        },
                    ] as const
                ).map((item) => (
                    <div
                        key={item.label}
                        className={`${item.color} border rounded-md p-4 flex items-center gap-3`}
                    >
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                            <p className="text-xs font-medium">{item.label}</p>
                            <p className="text-xs mt-0.5 opacity-70">
                                Record SLOs to see class stats here
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="font-semibold text-gray-800 mb-4 text-base">
                🧠 Core Competency Development
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                    [
                        "Communication & Collaboration",
                        "Critical Thinking & Problem Solving",
                        "Imagination & Creativity",
                        "Citizenship",
                        "Digital Literacy",
                        "Learning to Learn",
                        "Self-Efficacy",
                    ] as const
                ).map((competency) => (
                    <div
                        key={competency}
                        className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2"
                    >
                        <span className="text-sm text-gray-700">{competency}</span>
                        <span className="text-xs text-gray-400 italic">
                            Record competencies to see data
                        </span>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-base">
                🔗 Quick Links
            </h3>
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/teacher/cbc-reports"
                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors font-medium"
                >
                    📄 CBC Term Reports
                </Link>
                <Link
                    href="/teacher/slo"
                    className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors font-medium"
                >
                    🎯 SLO Management
                </Link>
                <Link
                    href="/teacher/competencies"
                    className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors font-medium"
                >
                    📊 Competency Recording
                </Link>
                <Link
                    href="/teacher/tasks"
                    className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors font-medium"
                >
                    ✏️ Task Rubric Marking
                </Link>
            </div>
        </div>
    </div>
);

// ─── Virtual Class Panel ──────────────────────────────────────────────────

const VirtualClassPanel = () => (
    <div className="bg-white border border-gray-200 rounded-md p-8 flex flex-col items-center text-center gap-4">
        <span className="text-5xl">🎥</span>
        <h3 className="text-lg font-semibold text-gray-800">
            Virtual Class Management
        </h3>
        <p className="text-sm text-gray-500 max-w-md">
            Online class scheduling, live streaming, auto-attendance tracking, and
            session recording are planned for a future release.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
            {[
                "Schedule Online Class",
                "Generate Join Link",
                "Track Live Attendance",
                "Auto-mark Attendance",
                "Record Session",
                "Chat Moderation",
            ].map((feature) => (
                <span
                    key={feature}
                    className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full border border-gray-200"
                >
                    {feature}
                </span>
            ))}
        </div>
        <span className="inline-block mt-4 text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200 px-4 py-1.5 rounded-full">
            🚧 Coming Soon — see docs/LMS_BACKLOG.md
        </span>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────

const TeacherLmsDashboardClient = ({
    teacherId,
    teacherName,
    term,
    academicYear,
    defaultAcademicYear,
    defaultTerm,
}: TeacherLmsDashboardClientProps) => {
    const [activeTab, setActiveTab] = useState<TabKey>("today");

    const handleQuickAction = (action: QuickAction) => {
        if (action.tab !== null) {
            setActiveTab(action.tab);
        }
    };

    const termLabel = TERM_LABELS[term];

    return (
        <div className="flex flex-col gap-5">
            {/* ── Top Header Bar ──────────────────────────────────────────── */}
            <div className="bg-white rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">
                        🧑‍🏫 Teaching Hub — {teacherName.split(" ")[0]}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {termLabel}&nbsp;·&nbsp;{academicYear} Academic Year&nbsp;·&nbsp;
                        <span className="text-lamaSky font-medium">CBC Dashboard</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium">
                        🇰🇪 Kenya CBC 2-6-3-3-3
                    </span>
                    <Link
                        href="/"
                        className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors font-medium"
                    >
                        → Main Dashboard
                    </Link>
                </div>
            </div>

            {/* ── Quick Action Cards ───────────────────────────────────────── */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-0.5">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {QUICK_ACTIONS.map((action) => {
                        const inner = (
                            <div
                                className={`${action.accentBg} border border-gray-100 rounded-md p-4 flex flex-col gap-2 h-full hover:shadow-sm transition-shadow cursor-pointer`}
                            >
                                <span className="text-2xl">{action.icon}</span>
                                <p className={`text-sm font-semibold ${action.accentText}`}>
                                    {action.label}
                                </p>
                                <p className="text-xs text-gray-500 leading-snug">
                                    {action.purpose}
                                </p>
                                <p className="text-xs text-gray-400 italic mt-auto">
                                    {action.cbcLabel}
                                </p>
                            </div>
                        );

                        if (action.href !== null) {
                            return (
                                <Link key={action.label} href={action.href} className="h-full">
                                    {inner}
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={action.label}
                                type="button"
                                className="text-left h-full"
                                onClick={() => handleQuickAction(action)}
                            >
                                {inner}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Navigation ──────────────────────────────────────────── */}
            <div className="bg-white rounded-md overflow-hidden">
                {/* Tab bar */}
                <div className="flex overflow-x-auto border-b border-gray-200">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.key
                                ? "border-lamaSky text-lamaSky bg-lamaSkyLight"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Active tab description */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs text-gray-500">
                        {TABS.find((t) => t.key === activeTab)?.description}
                    </p>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                    {activeTab === "today" && (
                        <TeacherTodayLessons teacherId={teacherId} />
                    )}

                    {activeTab === "slo" && (
                        <TeacherSloManagement
                            teacherId={teacherId}
                            defaultAcademicYear={defaultAcademicYear}
                            defaultTerm={defaultTerm}
                        />
                    )}

                    {activeTab === "competencies" && (
                        <TeacherCompetencyManagement
                            teacherId={teacherId}
                            defaultAcademicYear={defaultAcademicYear}
                            defaultTerm={defaultTerm}
                        />
                    )}

                    {activeTab === "tasks" && (
                        <TeacherTaskRubricMarking
                            teacherId={teacherId}
                            defaultAcademicYear={defaultAcademicYear}
                            defaultTerm={defaultTerm}
                        />
                    )}

                    {activeTab === "analytics" && <CbcAnalyticsPanel />}

                    {activeTab === "virtual" && <VirtualClassPanel />}
                </div>
            </div>
        </div>
    );
};

export default TeacherLmsDashboardClient;
