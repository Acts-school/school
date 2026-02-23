import React from "react";
import LessonViewerClient from "@/components/LessonViewerClient";

const LessonLearnPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    return (
        <div className="flex-1 p-4 flex flex-col gap-4 bg-gray-50">
            <h1 className="font-semibold text-2xl text-gray-800">Learning Environment</h1>
            <p className="text-gray-500 text-sm">
                Watch videos, read materials, and mark your lessons as complete.
            </p>

            <div className="bg-white rounded-md p-4 shadow-sm border border-gray-100 flex-1">
                <LessonViewerClient subjectId={resolvedParams.id} />
            </div>
        </div>
    );
};

export default LessonLearnPage;
