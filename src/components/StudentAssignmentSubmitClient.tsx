"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

// Types derived from existing schema structure
type Assignment = {
    id: number;
    title: string;
    dueDate: string;
    lesson: {
        name: string;
        subject: { name: string };
    };
};

type Submission = {
    id: number;
    status: string;
    fileUrl: string | null;
    textContent: string | null;
    submittedAt: string;
    result: {
        score: number;
    } | null;
};

const StudentAssignmentSubmitClient = ({ assignmentId }: { assignmentId: string }) => {
    // Since we don't have a specific API exposing just one assignment for a student,
    // we could just fetch it via standard listing or create a makeshift mock. 
    // In a robust implementation, this would call `/api/assignments/${id}`.

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(false);

    // Form fields
    const [fileUrl, setFileUrl] = useState("");
    const [textContent, setTextContent] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/assignmentSubmissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignmentId,
                    fileUrl,
                    textContent,
                }),
            });

            if (!res.ok) throw new Error("Could not submit assignment");

            const data = await res.json();
            setSubmission(data.data);
            toast.success("Assignment submitted successfully!");
        } catch (err) {
            toast.error("Error submitting assignment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Since we don't fetch the assignment context fully in this simplified MVP, 
          we assume they arrived here from the assignments list. */}

            {submission ? (
                <div className="bg-green-50 text-green-800 p-6 rounded-md border border-green-200 flex flex-col items-center justify-center text-center gap-4">
                    <div className="rounded-full bg-green-100 p-4">
                        <span className="text-4xl">✅</span>
                    </div>
                    <h2 className="text-2xl font-bold">Successfully Submitted!</h2>
                    <p>Your work has been recorded. Current status: <span className="font-bold underline">{submission.status}</span></p>

                    {submission.result ? (
                        <div className="mt-4 bg-white p-4 rounded-md shadow-sm border border-green-100 w-full max-w-sm">
                            <h3 className="text-sm text-gray-500 uppercase font-bold tracking-wider">Teacher Grade</h3>
                            <p className="text-4xl font-black text-lamaPurple mt-2">{submission.result.score}/100</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-2">Waiting for teacher to grade your submission.</p>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-md border border-blue-200">
                        <p className="text-sm"><strong>Instruction:</strong> Please upload your completed work file OR paste your written response below. (Simulating integration with Cloudinary for file upload).</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-gray-700">Attach Document (Cloudinary URL)</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="url"
                                placeholder="https://res.cloudinary.com/..."
                                className="ring-[1.5px] ring-gray-300 p-3 rounded-md text-sm w-full"
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                            />
                            <button type="button" className="bg-gray-100 px-4 py-3 rounded-md text-sm font-semibold border border-gray-300 hover:bg-gray-200 whitespace-nowrap">
                                Upload File
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">For safety, MVP accepts direct uploaded links.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <hr className="flex-1 border-gray-300" />
                        <span className="text-gray-400 font-bold text-sm">OR</span>
                        <hr className="flex-1 border-gray-300" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-gray-700">Write Response</label>
                        <textarea
                            rows={8}
                            placeholder="Start typing your assignment response here..."
                            className="ring-[1.5px] ring-gray-300 p-3 rounded-md text-sm w-full font-mono resize-y"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (!fileUrl && !textContent)}
                        className="bg-lamaPurple text-white py-3 rounded-md font-bold text-lg hover:bg-lamaPurple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? "Submitting..." : "Submit Assignment"}
                    </button>
                </form>
            )}
        </div>
    );
};

export default StudentAssignmentSubmitClient;
