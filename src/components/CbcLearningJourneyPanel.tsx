"use client";

import React, { useState } from "react";

// ─── Serialised types (passed from the server page) ──────────────────────────

export type SerializedEvidenceSummary = {
    observationCount: number;
    lastObservationNote: string | null;
};

export type SerializedSloRow = {
    sloId: number;
    sloCode: string | null;
    sloDescription: string;
    strandName: string;
    subStrandName: string;
    level: "BELOW_EXPECTATIONS" | "APPROACHING_EXPECTATIONS" | "MEETING_EXPECTATIONS";
    comment: string | null;
    evidence: SerializedEvidenceSummary;
};

export type SerializedLearningArea = {
    learningAreaName: string;
    slos: SerializedSloRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SLO_LEVEL_META = {
    MEETING_EXPECTATIONS: {
        label: "Meeting Expectations",
        badge: "bg-green-100 text-green-700 border-green-200",
        dot: "bg-green-500",
        icon: "🟢",
    },
    APPROACHING_EXPECTATIONS: {
        label: "Approaching",
        badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
        dot: "bg-yellow-400",
        icon: "🟡",
    },
    BELOW_EXPECTATIONS: {
        label: "Below Expectations",
        badge: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
        icon: "🔴",
    },
} as const;

// ─── Sub-strand group (collapsible) ──────────────────────────────────────────

type SubStrandGroup = {
    subStrandName: string;
    slos: SerializedSloRow[];
};

type StrandGroup = {
    strandName: string;
    subStrands: SubStrandGroup[];
};

const groupByStrand = (slos: SerializedSloRow[]): StrandGroup[] => {
    const strandMap = new Map<string, Map<string, SerializedSloRow[]>>();

    for (const slo of slos) {
        let subMap = strandMap.get(slo.strandName);
        if (!subMap) {
            subMap = new Map();
            strandMap.set(slo.strandName, subMap);
        }
        const existing = subMap.get(slo.subStrandName) ?? [];
        existing.push(slo);
        subMap.set(slo.subStrandName, existing);
    }

    return Array.from(strandMap.entries()).map(([strandName, subMap]) => ({
        strandName,
        subStrands: Array.from(subMap.entries()).map(([subStrandName, slosForSub]) => ({
            subStrandName,
            slos: slosForSub,
        })),
    }));
};

// ─── SLO Row ─────────────────────────────────────────────────────────────────

const SloRow = ({ slo }: { slo: SerializedSloRow }) => {
    const meta = SLO_LEVEL_META[slo.level];
    return (
        <div className="flex flex-col gap-1 py-2 pl-4 border-l-2 border-gray-100">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {slo.sloCode && (
                        <span className="text-xs font-mono text-gray-400 mr-1">{slo.sloCode}</span>
                    )}
                    <span className="text-xs text-gray-700">{slo.sloDescription}</span>
                </div>
                <span
                    className={`shrink-0 text-xs border px-2 py-0.5 rounded-full font-medium ${meta.badge}`}
                >
                    {meta.icon} {meta.label}
                </span>
            </div>
            {slo.comment && (
                <p className="text-xs text-gray-500 italic">💬 {slo.comment}</p>
            )}
            {slo.evidence.observationCount > 0 && (
                <p className="text-xs text-gray-400">
                    📎 {slo.evidence.observationCount} observation{slo.evidence.observationCount !== 1 ? "s" : ""} recorded
                    {slo.evidence.lastObservationNote && (
                        <span> · &ldquo;{slo.evidence.lastObservationNote}&rdquo;</span>
                    )}
                </p>
            )}
        </div>
    );
};

// ─── Learning Area Card (collapsible) ────────────────────────────────────────

const LearningAreaCard = ({ area }: { area: SerializedLearningArea }) => {
    const [open, setOpen] = useState(false);

    const strandGroups = groupByStrand(area.slos);
    const totalSlos = area.slos.length;
    const meetingCount = area.slos.filter((s) => s.level === "MEETING_EXPECTATIONS").length;
    const pct = totalSlos > 0 ? Math.round((meetingCount / totalSlos) * 100) : 0;

    return (
        <div className="border border-gray-200 rounded-md overflow-hidden">
            <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                onClick={() => setOpen((prev) => !prev)}
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800">{area.learningAreaName}</span>
                    <span className="text-xs text-gray-500">{totalSlos} SLO{totalSlos !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{pct}%</span>
                    </div>
                    <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
                </div>
            </button>

            {open && (
                <div className="px-4 py-3 flex flex-col gap-4">
                    {strandGroups.map((strand) => (
                        <div key={strand.strandName}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                {strand.strandName}
                            </p>
                            {strand.subStrands.map((sub) => (
                                <div key={sub.subStrandName} className="mb-3">
                                    <p className="text-xs text-gray-400 italic mb-1 pl-1">{sub.subStrandName}</p>
                                    <div className="flex flex-col gap-1">
                                        {sub.slos.map((slo) => (
                                            <SloRow key={slo.sloId} slo={slo} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type CbcLearningJourneyPanelProps = {
    learningAreas: SerializedLearningArea[];
    sloMeetingPct: number;
    strongestCompetency: string | null;
    focusCompetency: string | null;
    studentFirstName: string;
    term: string;
};

const CbcLearningJourneyPanel = ({
    learningAreas,
    sloMeetingPct,
    strongestCompetency,
    focusCompetency,
    studentFirstName,
    term,
}: CbcLearningJourneyPanelProps) => {
    const hasCbcData = learningAreas.length > 0;

    return (
        <div className="bg-white rounded-md p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-lg">🎯 My Learning Journey</h2>
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                    🇰🇪 CBC {term}
                </span>
            </div>

            {!hasCbcData ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-md p-6 text-center">
                    <p className="text-sm text-gray-500">
                        No CBC learning data has been recorded yet for this term.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Your teacher will update your SLOs and competencies as lessons progress.
                    </p>
                </div>
            ) : (
                <>
                    {/* Term Growth Hero */}
                    <div className="bg-gradient-to-br from-lamaSkyLight to-lamaPurpleLight rounded-md p-4 flex flex-col gap-3">
                        <p className="text-sm font-medium text-gray-700">
                            Hi {studentFirstName}! You are{" "}
                            <span className="font-bold text-gray-900">
                                meeting {sloMeetingPct}% of your learning expectations
                            </span>{" "}
                            this term. Keep it up!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2">
                            {strongestCompetency && (
                                <div className="flex-1 bg-white bg-opacity-70 border border-green-200 rounded-md px-3 py-2">
                                    <p className="text-xs text-green-600 font-semibold">🌟 Strength</p>
                                    <p className="text-xs text-gray-700 mt-0.5">{strongestCompetency}</p>
                                </div>
                            )}
                            {focusCompetency && (
                                <div className="flex-1 bg-white bg-opacity-70 border border-yellow-200 rounded-md px-3 py-2">
                                    <p className="text-xs text-yellow-600 font-semibold">🔎 Focus Area</p>
                                    <p className="text-xs text-gray-700 mt-0.5">{focusCompetency}</p>
                                </div>
                            )}
                        </div>

                        {/* Overall SLO bar */}
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>SLO Mastery</span>
                                <span className="font-semibold">{sloMeetingPct}%</span>
                            </div>
                            <div className="w-full bg-white bg-opacity-60 rounded-full h-2 border border-green-100">
                                <div
                                    className="bg-green-400 h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${sloMeetingPct}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Learning Areas */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">📚 My Learning Areas</h3>
                        <div className="flex flex-col gap-2">
                            {learningAreas.map((area) => (
                                <LearningAreaCard key={area.learningAreaName} area={area} />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CbcLearningJourneyPanel;
