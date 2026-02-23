import React from "react";
import QuizPlayerClient from "@/components/QuizPlayerClient";

const QuizPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;

    return (
        <div className="flex-1 flex flex-col p-4">
            <div className="bg-white rounded-md shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                <QuizPlayerClient examId={resolvedParams.id} />
            </div>
        </div>
    );
};

export default QuizPage;
