import React from "react";
import SubmissionsClient from "@/components/SubmissionsClient";

const SubmissionsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    return (
        <div className="flex-1 p-4 flex flex-col gap-4">
            <h1 className="font-semibold text-xl">Assignment Submissions</h1>
            <p className="text-gray-500 text-sm">
                View and grade student submissions for this assignment.
            </p>

            <div className="bg-white rounded-md p-4">
                <SubmissionsClient assignmentId={resolvedParams.id} />
            </div>
        </div>
    );
};

export default SubmissionsPage;
