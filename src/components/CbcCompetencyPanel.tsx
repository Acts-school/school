"use client";

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CbcCompetencyLiteral =
    | "COMMUNICATION_COLLABORATION"
    | "CRITICAL_THINKING_PROBLEM_SOLVING"
    | "IMAGINATION_CREATIVITY"
    | "CITIZENSHIP"
    | "DIGITAL_LITERACY"
    | "LEARNING_TO_LEARN"
    | "SELF_EFFICACY";

export type CbcCompetencyLevelLiteral =
    | "EMERGING"
    | "DEVELOPING"
    | "PROFICIENT"
    | "ADVANCED";

export type SerializedCompetencyRow = {
    competency: CbcCompetencyLiteral;
    level: CbcCompetencyLevelLiteral;
    comment: string | null;
    observationCount: number;
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

const COMPETENCY_META: Record<CbcCompetencyLiteral, { label: string; icon: string }> = {
    COMMUNICATION_COLLABORATION: { label: "Communication & Collaboration", icon: "🗣️" },
    CRITICAL_THINKING_PROBLEM_SOLVING: { label: "Critical Thinking & Problem Solving", icon: "🧠" },
    IMAGINATION_CREATIVITY: { label: "Imagination & Creativity", icon: "🎨" },
    CITIZENSHIP: { label: "Citizenship", icon: "🤝" },
    DIGITAL_LITERACY: { label: "Digital Literacy", icon: "💻" },
    LEARNING_TO_LEARN: { label: "Learning to Learn", icon: "📖" },
    SELF_EFFICACY: { label: "Self-Efficacy", icon: "💪" },
};

const LEVEL_META: Record<
    CbcCompetencyLevelLiteral,
    { label: string; color: string; rank: number }
> = {
    EMERGING: { label: "Emerging", color: "bg-red-100 text-red-700 border-red-200", rank: 1 },
    DEVELOPING: { label: "Developing", color: "bg-yellow-100 text-yellow-700 border-yellow-200", rank: 2 },
    PROFICIENT: { label: "Proficient", color: "bg-blue-100 text-blue-700 border-blue-200", rank: 3 },
    ADVANCED: { label: "Advanced", color: "bg-green-100 text-green-700 border-green-200", rank: 4 },
};

const ALL_COMPETENCIES: CbcCompetencyLiteral[] = [
    "COMMUNICATION_COLLABORATION",
    "CRITICAL_THINKING_PROBLEM_SOLVING",
    "IMAGINATION_CREATIVITY",
    "CITIZENSHIP",
    "DIGITAL_LITERACY",
    "LEARNING_TO_LEARN",
    "SELF_EFFICACY",
];

// ─── Single Competency Card ───────────────────────────────────────────────────

const CompetencyCard = ({ row }: { row: SerializedCompetencyRow | null; competency: CbcCompetencyLiteral }) => {
    const meta = COMPETENCY_META[row?.competency ?? "COMMUNICATION_COLLABORATION"];
    const levelMeta = row ? LEVEL_META[row.level] : null;
    const isStrength = row && (row.level === "ADVANCED" || row.level === "PROFICIENT");
    const isFocus = row && row.level === "EMERGING";

    return (
        <div
            className={`border rounded-md p-3 flex flex-col gap-2 ${isStrength
                    ? "border-green-200 bg-green-50"
                    : isFocus
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-gray-200 bg-white"
                }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0">{meta.icon}</span>
                    <span className="text-xs font-semibold text-gray-700 leading-snug">{meta.label}</span>
                </div>
                {isStrength && (
                    <span className="text-xs shrink-0">🌟</span>
                )}
                {isFocus && (
                    <span className="text-xs shrink-0">🔎</span>
                )}
            </div>

            {row !== null && levelMeta !== null ? (
                <>
                    <span
                        className={`self-start text-xs border px-2 py-0.5 rounded-full font-medium ${levelMeta.color}`}
                    >
                        {levelMeta.label}
                    </span>
                    {row.comment && (
                        <p className="text-xs text-gray-500 italic leading-snug">💬 {row.comment}</p>
                    )}
                    {row.observationCount > 0 && (
                        <p className="text-xs text-gray-400">
                            📎 {row.observationCount} observation{row.observationCount !== 1 ? "s" : ""}
                        </p>
                    )}
                </>
            ) : (
                <span className="text-xs text-gray-400 italic">Not yet recorded</span>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type CbcCompetencyPanelProps = {
    competencies: SerializedCompetencyRow[];
};

const CbcCompetencyPanel = ({ competencies }: CbcCompetencyPanelProps) => {
    const hasData = competencies.length > 0;

    // Build a lookup for quick access
    const byKey = new Map<CbcCompetencyLiteral, SerializedCompetencyRow>();
    for (const row of competencies) {
        byKey.set(row.competency, row);
    }

    return (
        <div className="bg-white rounded-md p-4 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-800 text-lg">🧠 Core Competency Development</h2>

            {!hasData ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-md p-5 text-center">
                    <p className="text-sm text-gray-500">
                        Competency records will appear here once your teacher records them.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {ALL_COMPETENCIES.map((competency) => (
                        <CompetencyCard
                            key={competency}
                            competency={competency}
                            row={byKey.get(competency) ?? null}
                        />
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
                {(["EMERGING", "DEVELOPING", "PROFICIENT", "ADVANCED"] as CbcCompetencyLevelLiteral[]).map((level) => {
                    const lm = LEVEL_META[level];
                    return (
                        <span key={level} className={`text-xs border px-2 py-0.5 rounded-full ${lm.color}`}>
                            {lm.label}
                        </span>
                    );
                })}
                <span className="text-xs text-gray-400 self-center">← CBC levels</span>
            </div>
        </div>
    );
};

export default CbcCompetencyPanel;
