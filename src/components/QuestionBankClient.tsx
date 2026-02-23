"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

type Choice = {
    id?: number;
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

const QuestionBankClient = ({ subjectId }: { subjectId: string }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newType, setNewType] = useState<QuestionType>("MULTIPLE_CHOICE");
    const [newText, setNewText] = useState("");
    const [newPoints, setNewPoints] = useState<number>(1);
    const [newChoices, setNewChoices] = useState<Choice[]>([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
    ]);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/questions?subjectId=${subjectId}`);
            if (!res.ok) throw new Error("Failed to fetch questions");
            const data = await res.json();
            setQuestions(data.data);
        } catch (err) {
            toast.error("Could not load question bank.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [subjectId]);

    const handleAddChoice = () => {
        setNewChoices([...newChoices, { text: "", isCorrect: false }]);
    };

    const handleChoiceChange = (index: number, text: string) => {
        const updated = [...newChoices];
        const item = updated[index];
        if (item) {
            item.text = text;
        }
        setNewChoices(updated);
    };

    const handleMarkCorrect = (index: number) => {
        const updated = [...newChoices];
        if (newType === "MULTIPLE_CHOICE" || newType === "TRUE_FALSE") {
            // Usually single correct answer, but can toggle
            updated.forEach((c, i) => (c.isCorrect = i === index));
        }
        setNewChoices(updated);
    };

    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newText.trim()) return toast.error("Question text is required");

        let choicesPayload = newChoices;
        if (newType === "TRUE_FALSE") {
            // Force exactly two choices for T/F internally if not set properly
            if (newChoices.length < 2) {
                return toast.error("True/False requires True and False options");
            }
        }
        if (newType === "SHORT_ANSWER") {
            choicesPayload = [];
        } else {
            // Validate MCQ/TF
            const hasCorrect = choicesPayload.some((c) => c.isCorrect);
            if (!hasCorrect) return toast.error("Please mark at least one correct choice");
            if (choicesPayload.some(c => !c.text.trim())) return toast.error("Choice text cannot be empty");
        }

        try {
            const res = await fetch("/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subjectId,
                    type: newType,
                    text: newText,
                    points: Number(newPoints),
                    choices: choicesPayload,
                }),
            });

            if (res.ok) {
                toast.success("Question added to bank!");
                setNewText("");
                setNewPoints(1);
                setNewChoices([
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                ]);
                setIsCreating(false);
                fetchQuestions();
            } else {
                toast.error("Failed to add question");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
            const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Question deleted");
                fetchQuestions();
            } else {
                toast.error("Failed to delete question");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    if (loading) return <div className="p-4">Loading Question Bank...</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Question Bank</h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-lamaSky text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-600 transition"
                >
                    {isCreating ? "Cancel" : "+ Add Question"}
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateQuestion} className="bg-white p-4 rounded-md shadow-sm border border-gray-100 flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-sm font-medium text-gray-500">Question Type</label>
                            <select
                                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                                value={newType}
                                onChange={(e) => {
                                    const type = e.target.value as QuestionType;
                                    setNewType(type);
                                    if (type === "TRUE_FALSE") {
                                        setNewChoices([
                                            { text: "True", isCorrect: true },
                                            { text: "False", isCorrect: false },
                                        ]);
                                    } else if (type === "MULTIPLE_CHOICE") {
                                        setNewChoices([
                                            { text: "", isCorrect: false },
                                            { text: "", isCorrect: false },
                                        ]);
                                    }
                                }}
                            >
                                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                                <option value="TRUE_FALSE">True / False</option>
                                <option value="SHORT_ANSWER">Short Answer</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 w-24">
                            <label className="text-sm font-medium text-gray-500">Points</label>
                            <input
                                type="number"
                                min="1"
                                value={newPoints}
                                onChange={(e) => setNewPoints(Number(e.target.value))}
                                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-500">Question Text</label>
                        <textarea
                            rows={3}
                            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm resize-none"
                            placeholder="Type your question here..."
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                        />
                    </div>

                    {newType !== "SHORT_ANSWER" && (
                        <div className="flex flex-col gap-2 border-t pt-4">
                            <label className="text-sm font-medium text-gray-500">Answers / Choices ({newType === "MULTIPLE_CHOICE" ? "Select the correct one" : "Toggle correct value"})</label>
                            {newChoices.map((choice, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="correctChoice"
                                        checked={choice.isCorrect}
                                        onChange={() => handleMarkCorrect(idx)}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        value={choice.text}
                                        onChange={(e) => handleChoiceChange(idx, e.target.value)}
                                        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm flex-1"
                                        placeholder={`Option ${idx + 1}`}
                                        disabled={newType === "TRUE_FALSE"}
                                    />
                                </div>
                            ))}
                            {newType === "MULTIPLE_CHOICE" && (
                                <button
                                    type="button"
                                    onClick={handleAddChoice}
                                    className="text-xs text-lamaSky font-medium self-start mt-2 hover:underline"
                                >
                                    + Add another option
                                </button>
                            )}
                        </div>
                    )}

                    <button type="submit" className="bg-lamaYellow self-end hover:bg-yellow-400 font-semibold px-6 py-2 rounded-md transition-colors mt-2">
                        Save Question
                    </button>
                </form>
            )}

            {questions.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500 border border-dashed border-gray-300">
                    No questions in this bank yet.
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{q.type.replace("_", " ")}</span>
                                <div className="flex gap-4 items-center">
                                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{q.points} pt</span>
                                    <button onClick={() => handleDelete(q.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                                </div>
                            </div>
                            <h3 className="text-gray-800 font-medium text-lg leading-snug mb-4">{idx + 1}. {q.text}</h3>

                            {q.type !== "SHORT_ANSWER" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                    {q.choices.map((c) => (
                                        <div key={c.id} className={`p-2 rounded border text-sm flex items-center gap-2 ${c.isCorrect ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                            <div className={`w-3 h-3 rounded-full ${c.isCorrect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            {c.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuestionBankClient;
