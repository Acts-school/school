"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

type Choice = {
    id: number;
    text: string;
    isCorrect: boolean;
};

type Question = {
    id: number;
    type: QuestionType;
    text: string;
    points: number;
    choices: Choice[];
};

type ExamData = {
    id: number;
    title: string;
    durationMinutes: number | null;
    questions: { question: Question; order: number }[];
};

type StudentAnswer = {
    questionId: number;
    choiceId?: number;
    textResponse?: string;
};

type QuizPlayerClientProps = {
    examId: string;
};

const QuizPlayerClient = ({ examId }: QuizPlayerClientProps) => {
    const [exam, setExam] = useState<ExamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, StudentAnswer>>({});
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load exam details and start attempt
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Get exam questions
                const qRes = await fetch(`/api/exams/${examId}/questions`);
                if (!qRes.ok) throw new Error("Could not load exam");
                const qData = await qRes.json();

                // 2. Get exam metadata
                const eRes = await fetch(`/api/exams?examId=${examId}`);
                const eData = eRes.ok ? await eRes.json() : null;
                const examMeta = eData?.data?.find((e: { id: number }) => e.id === parseInt(examId, 10)) ?? null;

                const examObj: ExamData = {
                    id: parseInt(examId, 10),
                    title: examMeta?.title ?? "Quiz",
                    durationMinutes: examMeta?.durationMinutes ?? null,
                    questions: qData.data ?? [],
                };
                setExam(examObj);

                // 3. Start a new attempt
                const aRes = await fetch(`/api/exams/${examId}/attempt`, { method: "POST" });
                if (!aRes.ok) throw new Error("Could not start exam attempt");
                const aData = await aRes.json();
                setAttemptId(aData.data.id);

                // 4. Start timer if duration is set
                if (examObj.durationMinutes) {
                    setSecondsLeft(examObj.durationMinutes * 60);
                }
            } catch (err) {
                toast.error("Could not load quiz. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [examId]);

    const handleSubmit = useCallback(async () => {
        if (!attemptId || submitting) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const answersArray = Object.values(answers);
            const res = await fetch(`/api/exams/${examId}/attempt`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId, answers: answersArray }),
            });

            if (!res.ok) throw new Error("Submission failed");
            const data = await res.json();
            setScore(data.score ?? 0);
            setSubmitted(true);
            toast.success("Quiz submitted!");
        } catch {
            toast.error("Could not submit quiz. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }, [attemptId, answers, examId, submitting]);

    // Countdown timer
    useEffect(() => {
        if (secondsLeft === null || submitted) return;

        timerRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev === null) return null;
                if (prev <= 1) {
                    // Auto-submit when time is up
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [secondsLeft, submitted, handleSubmit]);

    const setAnswer = (questionId: number, answer: Partial<StudentAnswer>) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { questionId, ...prev[questionId], ...answer },
        }));
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-gray-500">Loading quiz...</div>
            </div>
        );
    }

    if (!exam || exam.questions.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                This exam has no questions yet. Please check back later.
            </div>
        );
    }

    if (submitted) {
        const total = exam.questions.reduce((sum, eq) => sum + eq.question.points, 0);
        return (
            <div className="p-8 flex flex-col items-center gap-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Quiz Submitted!</h2>
                <p className="text-gray-500">Your score for <span className="font-semibold">{exam.title}</span></p>
                <div className="text-5xl font-bold text-lamaSky">
                    {score} <span className="text-2xl text-gray-400">/ {total}</span>
                </div>
                <p className="text-sm text-gray-400">
                    {score !== null && total > 0
                        ? `${Math.round((score / total) * 100)}% — ${score >= total * 0.5 ? "Well done! 🎉" : "Keep practicing!"}`
                        : ""}
                </p>
            </div>
        );
    }

    const sortedQuestions = [...exam.questions].sort((a, b) => a.order - b.order);
    const currentEQ = sortedQuestions[currentIndex];
    const currentQ = currentEQ?.question;
    const answeredCount = Object.keys(answers).length;
    const isLast = currentIndex === sortedQuestions.length - 1;
    const isTimeLow = secondsLeft !== null && secondsLeft < 60;

    return (
        <div className="flex flex-col gap-0 h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                <div>
                    <h2 className="font-bold text-lg text-gray-800">{exam.title}</h2>
                    <p className="text-xs text-gray-400">{answeredCount} / {sortedQuestions.length} answered</p>
                </div>
                {secondsLeft !== null && (
                    <div className={`font-mono font-bold text-xl px-4 py-2 rounded-lg ${isTimeLow ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-700"}`}>
                        {formatTime(secondsLeft)}
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-1">
                <div
                    className="bg-lamaSky h-1 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / sortedQuestions.length) * 100}%` }}
                />
            </div>

            {/* Question body */}
            {currentQ && (
                <div className="flex-1 p-6 flex flex-col gap-6">
                    <div className="flex gap-3 items-start">
                        <span className="shrink-0 w-8 h-8 rounded-full bg-lamaSky text-white flex items-center justify-center font-bold text-sm">
                            {currentIndex + 1}
                        </span>
                        <p className="text-gray-800 font-medium text-lg leading-relaxed">{currentQ.text}</p>
                    </div>

                    <div className="flex flex-col gap-3 ml-11">
                        {currentQ.type === "SHORT_ANSWER" ? (
                            <textarea
                                rows={4}
                                className="ring-[1.5px] ring-gray-300 p-3 rounded-md text-sm resize-none w-full"
                                placeholder="Type your answer here..."
                                value={answers[currentQ.id]?.textResponse ?? ""}
                                onChange={(e) => setAnswer(currentQ.id, { textResponse: e.target.value })}
                            />
                        ) : (
                            currentQ.choices.map((choice) => {
                                const isSelected = answers[currentQ.id]?.choiceId === choice.id;
                                return (
                                    <button
                                        key={choice.id}
                                        onClick={() => setAnswer(currentQ.id, { choiceId: choice.id })}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm font-medium ${isSelected
                                            ? "border-lamaSky bg-blue-50 text-blue-700"
                                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        {choice.text}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                <button
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                    ← Previous
                </button>

                {/* Question dots */}
                <div className="flex gap-1">
                    {sortedQuestions.map((sq, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentIndex
                                ? "bg-lamaSky"
                                : answers[sq.question.id]
                                    ? "bg-green-400"
                                    : "bg-gray-300"
                                }`}
                        />
                    ))}
                </div>

                {isLast ? (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2 text-sm font-semibold bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:opacity-60"
                    >
                        {submitting ? "Submitting..." : "Submit Quiz ✓"}
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentIndex((i) => Math.min(sortedQuestions.length - 1, i + 1))}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                    >
                        Next →
                    </button>
                )}
            </div>
        </div>
    );
};

export default QuizPlayerClient;
