"use client";

import React, { useState } from "react";
import CourseBuilderClient from "./CourseBuilderClient";
import QuestionBankClient from "./QuestionBankClient";
import QuizEditorClient from "./QuizEditorClient";

const SubjectBuilderTabsClient = ({ subjectId }: { subjectId: string }) => {
    const [activeTab, setActiveTab] = useState<"modules" | "questions" | "quizEditor">("modules");

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("modules")}
                    className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === "modules"
                        ? "border-lamaSky text-lamaSky"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Course Modules
                </button>
                <button
                    onClick={() => setActiveTab("questions")}
                    className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === "questions"
                        ? "border-lamaSky text-lamaSky"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Question Bank
                </button>
                <button
                    onClick={() => setActiveTab("quizEditor")}
                    className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === "quizEditor"
                        ? "border-lamaSky text-lamaSky"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Quiz Editor
                </button>
            </div>

            <div className="mt-4">
                {activeTab === "modules" ? (
                    <CourseBuilderClient subjectId={subjectId} />
                ) : activeTab === "questions" ? (
                    <QuestionBankClient subjectId={subjectId} />
                ) : (
                    <QuizEditorClient subjectId={subjectId} />
                )}
            </div>
        </div>
    );
};

export default SubjectBuilderTabsClient;
