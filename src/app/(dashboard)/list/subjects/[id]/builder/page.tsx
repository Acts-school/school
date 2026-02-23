import React from "react";
import SubjectBuilderTabsClient from "@/components/SubjectBuilderTabsClient";

const CourseBuilderPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    return (
        <div className="flex-1 p-4 flex flex-col gap-4">
            <h1 className="font-semibold text-xl">LMS Course Builder</h1>
            <p className="text-gray-500 text-sm">
                Build units, manage lessons, and currate your question bank.
            </p>

            <div className="bg-white rounded-md p-4">
                <SubjectBuilderTabsClient subjectId={resolvedParams.id} />
            </div>
        </div>
    );
};

export default CourseBuilderPage;
