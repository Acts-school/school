"use client";

import React from "react";
import Link from "next/link";

type TimetableLesson = {
    id: number;
    startTime: string;
    subjectName: string;
    teacherName: string;
};

const LmsTimetableCard = ({ lessons }: { lessons: TimetableLesson[] }) => {
    const now = new Date();

    return (
        <div className="bg-white rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">📅 Today&apos;s Timetable</h2>
                <Link href="/list/lessons" className="text-xs text-lamaSky hover:underline">
                    Full schedule
                </Link>
            </div>
            {lessons.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No classes scheduled for today.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {lessons.map((lesson) => {
                        const start = new Date(lesson.startTime);
                        const isPast = start < now;
                        const isNow =
                            start <= now &&
                            new Date(lesson.startTime).getTime() + 60 * 60 * 1000 > now.getTime();

                        return (
                            <div
                                key={lesson.id}
                                className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isNow
                                        ? "bg-lamaSkyLight border border-lamaSky"
                                        : isPast
                                            ? "opacity-50"
                                            : "bg-gray-50"
                                    }`}
                            >
                                <div className="text-xs font-mono text-gray-500 w-12 shrink-0">
                                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-800 truncate">
                                        {lesson.subjectName}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">{lesson.teacherName}</div>
                                </div>
                                {isNow && (
                                    <span className="text-xs bg-lamaSky text-white px-2 py-0.5 rounded-full font-medium">
                                        Now
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LmsTimetableCard;
