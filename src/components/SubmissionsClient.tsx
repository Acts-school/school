"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

type Submission = {
    id: number;
    student: {
        name: string;
        surname: string;
    };
    fileUrl: string | null;
    textContent: string | null;
    status: string;
    result: {
        score: number;
    } | null;
    submittedAt: string;
};

const SubmissionsClient = ({ assignmentId }: { assignmentId: string }) => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    // For grading modal
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
    const [score, setScore] = useState<string>("");

    const fetchSubmissions = async () => {
        try {
            // Create a specific API to get submissions for an assignment
            const res = await fetch(`/api/assignments/${assignmentId}/submissions`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setSubmissions(data.data);
        } catch (err) {
            toast.error("Could not load submissions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [assignmentId]);

    const handleGradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gradingSubmission || !score) return;

        try {
            const res = await fetch(`/api/assignmentSubmissions/${gradingSubmission.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: Number.parseInt(score, 10) }),
            });

            if (res.ok) {
                toast.success("Submission graded!");
                setGradingSubmission(null);
                setScore("");
                fetchSubmissions();
            } else {
                throw new Error("Failed to grade");
            }
        } catch (error) {
            toast.error("Error saving grade.");
        }
    };

    if (loading) return <div>Loading submissions...</div>;

    return (
        <div className="flex flex-col gap-4">
            {submissions.length === 0 ? (
                <p className="text-gray-500 italic mt-4">No submissions yet.</p>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b text-gray-500 text-sm">
                            <th className="py-2">Student</th>
                            <th className="py-2">Submitted At</th>
                            <th className="py-2">Status</th>
                            <th className="py-2">Grade</th>
                            <th className="py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map((sub) => (
                            <tr key={sub.id} className="border-b even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
                                <td className="py-2 font-medium">
                                    {sub.student.name} {sub.student.surname}
                                </td>
                                <td className="py-2">{new Date(sub.submittedAt).toLocaleString()}</td>
                                <td className="py-2">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.status === "GRADED" ? "bg-green-100 text-green-700" : "bg-lamaYellowLight text-yellow-700"}`}>
                                        {sub.status}
                                    </span>
                                </td>
                                <td className="py-2 font-bold text-gray-700">
                                    {sub.result?.score ?? "-"}
                                </td>
                                <td className="py-2 flex gap-2">
                                    {sub.fileUrl && (
                                        <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                                            View File
                                        </a>
                                    )}
                                    <button
                                        onClick={() => { setGradingSubmission(sub); setScore(sub.result?.score?.toString() || ""); }}
                                        className="text-lamaPurple font-medium hover:underline ml-2"
                                    >
                                        Grade
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Grading Modal */}
            {gradingSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-md shadow-lg w-96 flex flex-col gap-4">
                        <h2 className="text-lg font-bold">Grade Submission</h2>
                        <p className="text-sm text-gray-600">
                            Student: <span className="font-semibold">{gradingSubmission.student.name} {gradingSubmission.student.surname}</span>
                        </p>
                        {gradingSubmission.textContent && (
                            <div className="p-3 bg-gray-50 rounded text-sm max-h-40 overflow-auto border">
                                {gradingSubmission.textContent}
                            </div>
                        )}
                        <form onSubmit={handleGradeSubmit} className="flex flex-col gap-2 mt-2">
                            <label className="text-xs text-gray-500 font-semibold">Score</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                className="ring-1 ring-gray-300 p-2 rounded text-sm"
                                required
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setGradingSubmission(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm bg-lamaPurple text-white rounded hover:bg-lamaPurple/90">
                                    Save Grade
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmissionsClient;
