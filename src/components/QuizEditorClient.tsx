"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

type Choice = {
    id: number;
    text: string;
    isCorrect: boolean;
};

type BankQuestion = {
    id: number;
    type: QuestionType;
    text: string;
    points: number;
    choices: Choice[];
};

type ExamRow = {
    id: number;
    title: string;
    durationMinutes: number | null;
    startTime: string;
    endTime: string;
};

type QuizEditorClientProps = {
    subjectId: string;
};

const QuizEditorClient = ({ subjectId }: QuizEditorClientProps) => {
    const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
    const [exams, setExams] = useState<ExamRow[]>([]);
    const [loadingBank, setLoadingBank] = useState(true);

    // For the selected exam's questions
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    const [examQuestionIds, setExamQuestionIds] = useState<number[]>([]);
    const [savingQuestions, setSavingQuestions] = useState(false);

    // Fetch available bank questions
    const fetchBankQuestions = async () => {
        try {
            setLoadingBank(true);
            const res = await fetch(`/api/questions?subjectId=${subjectId}`);
            if (!res.ok) throw new Error("Failed to fetch bank");
            const data = await res.json();
            setBankQuestions(data.data ?? []);
        } catch {
            toast.error("Could not load question bank.");
        } finally {
            setLoadingBank(false);
        }
    };

    // Fetch existing exams for this subject (via lessons)
    const fetchExams = async () => {
        try {
            const res = await fetch(`/api/exams?subjectId=${subjectId}`);
            if (res.ok) {
                const data = await res.json();
                setExams(data.data ?? []);
            }
        } catch {
            // Exams endpoint may not yet exist; silently ignore
        }
    };

    useEffect(() => {
        fetchBankQuestions();
        fetchExams();
    }, [subjectId]);

    // When an exam is selected, load its current questions
    const handleSelectExam = async (examId: number) => {
        setSelectedExamId(examId);
        try {
            const res = await fetch(`/api/exams/${examId}/questions`);
            if (res.ok) {
                const data = await res.json();
                const ids: number[] = (data.data ?? []).map((eq: { questionId: number }) => eq.questionId);
                setExamQuestionIds(ids);
            }
        } catch {
            toast.error("Could not load quiz questions.");
        }
    };

    const toggleQuestion = (qId: number) => {
        setExamQuestionIds((prev) =>
            prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
        );
    };

    const handleSaveQuiz = async () => {
        if (!selectedExamId) return;
        setSavingQuestions(true);
        try {
            const res = await fetch(`/api/exams/${selectedExamId}/questions`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionIds: examQuestionIds }),
            });
            if (res.ok) {
                toast.success("Quiz saved!");
            } else {
                toast.error("Failed to save quiz.");
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setSavingQuestions(false);
        }
    };

    const totalPoints = bankQuestions
        .filter((q) => examQuestionIds.includes(q.id))
        .reduce((sum, q) => sum + q.points, 0);

    const selectedExam = exams.find((e) => e.id === selectedExamId);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-xl font-bold mb-1">Quiz Editor</h2>
                <p className="text-sm text-gray-500">Select an exam, then pick questions from the bank to add to it.</p>
            </div>

            {/* Exam selector */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-600">Select Exam to Configure</label>
                {exams.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                        No exams found. Create an exam for a lesson first via the Exams page.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {exams.map((exam) => (
                            <button
                                key={exam.id}
                                onClick={() => handleSelectExam(exam.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${selectedExamId === exam.id
                                        ? "bg-lamaSky text-white border-lamaSky"
                                        : "bg-white text-gray-700 border-gray-300 hover:border-lamaSky"
                                    }`}
                            >
                                {exam.title}
                                {exam.durationMinutes ? ` (${exam.durationMinutes} min)` : ""}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedExamId && (
                <>
                    <div className="flex justify-between items-center border-t pt-4">
                        <div>
                            <span className="text-sm font-semibold text-gray-700">
                                {examQuestionIds.length} question(s) selected
                            </span>
                            <span className="ml-3 text-sm text-gray-400">
                                Total: {totalPoints} points
                            </span>
                        </div>
                        <button
                            onClick={handleSaveQuiz}
                            disabled={savingQuestions}
                            className="bg-lamaYellow hover:bg-yellow-400 font-semibold px-5 py-2 rounded-md transition-colors disabled:opacity-60"
                        >
                            {savingQuestions ? "Saving..." : "Save Quiz"}
                        </button>
                    </div>

                    {loadingBank ? (
                        <div className="text-gray-400 text-sm">Loading question bank...</div>
                    ) : bankQuestions.length === 0 ? (
                        <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-400 border border-dashed">
                            Question bank is empty. Add questions in the &quot;Question Bank&quot; tab first.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Available Questions</h3>
                            {bankQuestions.map((q, idx) => {
                                const isSelected = examQuestionIds.includes(q.id);
                                return (
                                    <div
                                        key={q.id}
                                        onClick={() => toggleQuestion(q.id)}
                                        className={`p-3 rounded-md border cursor-pointer transition-all select-none ${isSelected
                                                ? "bg-blue-50 border-blue-400 shadow-sm"
                                                : "bg-white border-gray-200 hover:border-gray-400"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center flex-1">
                                                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white"}`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-800 leading-snug">
                                                    <span className="font-medium text-gray-400 mr-1">Q{idx + 1}.</span>
                                                    {q.text}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 ml-4 shrink-0">
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{q.type.replace(/_/g, " ")}</span>
                                                <span className="text-xs bg-lamaPurpleLight text-lamaPurple font-semibold px-2 py-0.5 rounded">{q.points}pt</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default QuizEditorClient;
