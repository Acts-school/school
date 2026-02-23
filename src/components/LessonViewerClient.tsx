"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

type Material = {
    id: number;
    title: string;
    type: string;
    url: string | null;
    content: string | null;
};

type LessonProgress = {
    completed: boolean;
    completedAt: string | null;
};

type LessonType = {
    id: number;
    name: string;
    materials: Material[];
    progress: LessonProgress[];
};

type UnitType = {
    id: number;
    title: string;
    description: string | null;
    lessons: LessonType[];
};

type DiscussionMessage = {
    id: number;
    body: string;
    senderUserId: string;
    createdAt: string;
};

const LessonViewerClient = ({ subjectId }: { subjectId: string }) => {
    const [units, setUnits] = useState<UnitType[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeLesson, setActiveLesson] = useState<LessonType | null>(null);
    const [activeUnit, setActiveUnit] = useState<UnitType | null>(null);
    const [activeTab, setActiveTab] = useState<"content" | "discussion">("content");

    // Discussion state
    const [threadId, setThreadId] = useState<number | null>(null);
    const [messages, setMessages] = useState<DiscussionMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const fetchUnits = async () => {
        try {
            const res = await fetch(`/api/units?subjectId=${subjectId}`);
            if (!res.ok) throw new Error("Failed to fetch units");
            const data = await res.json();
            setUnits(data.data);

            // Auto-select first available lesson
            if (data.data.length > 0 && data.data[0].lessons.length > 0 && !activeLesson) {
                setActiveLesson(data.data[0].lessons[0]);
                setActiveUnit(data.data[0]);
            }
        } catch {
            toast.error("Could not load course materials.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subjectId]);

    // Load discussion when unit changes or tab switches to discussion
    useEffect(() => {
        if (!activeUnit || activeTab !== "discussion") return;
        const loadDiscussion = async () => {
            try {
                const res = await fetch(`/api/messages?unitId=${activeUnit.id}`);
                if (!res.ok) return;
                const data = await res.json();
                setThreadId(data.threadId ?? null);
                setMessages(data.messages ?? []);
            } catch {
                // silently ignore
            }
        };
        loadDiscussion();
    }, [activeUnit, activeTab]);

    // Scroll to bottom of discussion
    useEffect(() => {
        if (activeTab === "discussion") {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, activeTab]);

    const toggleComplete = async (lessonId: number, currentlyCompleted: boolean) => {
        try {
            const res = await fetch("/api/lessonProgress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId, completed: !currentlyCompleted }),
            });
            if (res.ok) {
                toast.success(currentlyCompleted ? "Marked as incomplete" : "Lesson completed 🎉");
                fetchUnits();
            }
        } catch {
            toast.error("Error updating progress");
        }
    };

    const handleSelectLesson = (lesson: LessonType, unit: UnitType) => {
        setActiveLesson(lesson);
        setActiveUnit(unit);
        setActiveTab("content");
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !threadId) return;
        setSendingMsg(true);
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threadId, body: newMessage.trim() }),
            });
            if (res.ok) {
                setNewMessage("");
                // Refetch messages
                const refreshRes = await fetch(`/api/messages?unitId=${activeUnit?.id}`);
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    setMessages(data.messages ?? []);
                }
            } else {
                toast.error("Failed to send message");
            }
        } catch {
            toast.error("Error sending message");
        } finally {
            setSendingMsg(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading your course...</div>;
    if (units.length === 0) return <div className="p-8 text-center text-gray-500">No content published for this course yet.</div>;

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px]">
            {/* Sidebar - Course Index */}
            <div className="w-full md:w-1/3 border-r pr-4 overflow-y-auto">
                <h2 className="font-bold text-lg mb-4 text-gray-800">Course Contents</h2>
                <div className="flex flex-col gap-4">
                    {units.map((unit) => (
                        <div key={unit.id} className="border border-gray-200 rounded-md overflow-hidden">
                            <div className="bg-gray-100 p-3 font-semibold text-gray-700 border-b flex justify-between items-center">
                                <span>{unit.title}</span>
                                <button
                                    onClick={() => {
                                        setActiveUnit(unit);
                                        setActiveTab("discussion");
                                    }}
                                    className="text-xs text-blue-500 hover:underline font-normal"
                                >
                                    💬 Discuss
                                </button>
                            </div>
                            <div className="flex flex-col">
                                {unit.lessons.length === 0 && (
                                    <div className="p-3 text-sm text-gray-400 italic">No lessons in this unit.</div>
                                )}
                                {unit.lessons.map((lesson) => {
                                    const isCompleted = lesson.progress?.[0]?.completed === true;
                                    const isActive = activeLesson?.id === lesson.id;

                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => handleSelectLesson(lesson, unit)}
                                            className={`text-left p-3 text-sm border-b last:border-0 hover:bg-lamaPurpleLight transition-colors flex justify-between items-center
                        ${isActive ? "bg-lamaPurpleLight border-l-4 border-l-lamaPurple" : ""}
                      `}
                                        >
                                            <span className={`${isActive ? "font-bold text-lamaPurple" : "text-gray-600"}`}>
                                                {lesson.name}
                                            </span>
                                            {isCompleted && (
                                                <span className="text-green-500 font-bold">✓</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-2/3 flex flex-col gap-4">
                {activeLesson ? (
                    <>
                        {/* Tab Bar */}
                        <div className="flex gap-4 border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab("content")}
                                className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === "content"
                                        ? "border-lamaPurple text-lamaPurple"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                📖 Content
                            </button>
                            <button
                                onClick={() => setActiveTab("discussion")}
                                className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === "discussion"
                                        ? "border-lamaPurple text-lamaPurple"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                💬 Discussion
                            </button>
                        </div>

                        {activeTab === "content" ? (
                            <>
                                <div className="flex justify-between items-start pt-2">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">{activeLesson.name}</h2>
                                        <p className="text-sm text-gray-500 mt-1">{activeLesson.materials.length} learning materials</p>
                                    </div>

                                    <button
                                        onClick={() => toggleComplete(activeLesson.id, activeLesson.progress?.[0]?.completed ?? false)}
                                        className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors
                  ${activeLesson.progress?.[0]?.completed ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-lamaPurple text-white hover:bg-lamaPurple/90"}
                `}
                                    >
                                        {activeLesson.progress?.[0]?.completed ? "Completed ✓" : "Mark as Complete"}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-6 mt-2">
                                    {activeLesson.materials.length === 0 ? (
                                        <div className="text-center p-8 bg-gray-50 rounded-md text-gray-500 italic">
                                            No materials attached to this lesson.
                                        </div>
                                    ) : (
                                        activeLesson.materials.map((mat) => (
                                            <div key={mat.id} className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold text-white uppercase
                        ${mat.type === "VIDEO" ? "bg-red-500" : mat.type === "PDF" ? "bg-red-700" : "bg-blue-500"}
                      `}>
                                                        {mat.type}
                                                    </span>
                                                    <h3 className="font-bold text-gray-800">{mat.title}</h3>
                                                </div>

                                                {mat.type === "TEXT" && mat.content && (
                                                    <div className="p-4 bg-gray-50 rounded text-gray-700 text-sm leading-relaxed border border-gray-100">
                                                        {mat.content}
                                                    </div>
                                                )}

                                                {mat.type === "VIDEO" && mat.url && (
                                                    <div className="aspect-video w-full bg-black rounded overflow-hidden">
                                                        <iframe
                                                            src={mat.url.replace("watch?v=", "embed/")}
                                                            className="w-full h-full"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                )}

                                                {["PDF", "DOCUMENT", "LINK"].includes(mat.type) && mat.url && (
                                                    <a
                                                        href={mat.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-md text-sm font-medium text-gray-700 transition-colors"
                                                    >
                                                        <span className="text-xl">📄</span> Open {mat.type} in new tab
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Discussion Tab */
                            <div className="flex flex-col h-[500px] border border-gray-200 rounded-md overflow-hidden">
                                <div className="bg-gray-50 p-3 font-semibold text-gray-700 border-b text-sm">
                                    💬 Unit Discussion — {activeUnit?.title}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                                    {messages.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm">
                                            No messages yet. Be the first to start the discussion!
                                        </div>
                                    ) : (
                                        messages.map((msg) => (
                                            <div key={msg.id} className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-lamaSky text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                        {msg.senderUserId.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 shadow-sm max-w-prose">
                                                        {msg.body}
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-400 ml-9">
                                                    {new Date(msg.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                <form onSubmit={handleSendMessage} className="border-t p-3 flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Ask a question or share a thought..."
                                        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm flex-1"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sendingMsg || !newMessage.trim()}
                                        className="bg-lamaSky text-white px-4 py-2 rounded-md font-semibold text-sm hover:bg-blue-600 transition disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">
                        Select a lesson from the sidebar to begin learning.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonViewerClient;
