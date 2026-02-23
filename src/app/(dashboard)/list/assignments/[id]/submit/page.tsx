import React from "react";
import StudentAssignmentSubmitClient from "@/components/StudentAssignmentSubmitClient";

const AssignmentSubmitPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    return (
        <div className="flex-1 p-4 flex flex-col gap-4 bg-gray-50 h-full">
            <h1 className="font-semibold text-2xl text-gray-800">Assignment Submission</h1>
            <p className="text-gray-500 text-sm">
                Review the assignment details and submit your work below.
            </p>

            <div className="bg-white rounded-md p-6 shadow-sm border border-gray-100 flex-1 max-w-4xl mx-auto w-full">
                <StudentAssignmentSubmitClient assignmentId={resolvedParams.id} />
            </div>
        </div>
    );
};

export default AssignmentSubmitPage;
