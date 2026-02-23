"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Image from "next/image";
import MaterialManager from "./MaterialManager";

type Unit = {
    id: number;
    title: string;
    description: string;
    order: number;
    lessons: Lesson[];
};

type Lesson = {
    id: number;
    name: string;
    order: number;
    materials: Material[];
};

type Material = {
    id: number;
    title: string;
    type: string;
    url: string;
};

const CourseBuilderClient = ({ subjectId }: { subjectId: string }) => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUnitTitle, setNewUnitTitle] = useState("");

    const fetchUnits = async () => {
        try {
            const res = await fetch(`/api/units?subjectId=${subjectId}`);
            if (!res.ok) throw new Error("Failed to fetch units");
            const data = await res.json();
            setUnits(data.data);
        } catch (err) {
            toast.error("Could not load course units.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
    }, [subjectId]);

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitTitle.trim()) return;

        try {
            const res = await fetch("/api/units", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newUnitTitle,
                    subjectId,
                    order: units.length,
                }),
            });
            if (res.ok) {
                setNewUnitTitle("");
                fetchUnits();
                toast.success("Unit added!");
            }
        } catch (err) {
            toast.error("Failed to add unit");
        }
    };

    if (loading) return <div className="p-4">Loading course...</div>;

    return (
        <div className="flex flex-col gap-6">
            {/* Unit Form */}
            <form onSubmit={handleAddUnit} className="flex gap-2 items-center">
                <input
                    type="text"
                    placeholder="New Unit Title (e.g. Chapter 1)"
                    className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm flex-1 max-w-sm"
                    value={newUnitTitle}
                    onChange={(e) => setNewUnitTitle(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-lamaYellow hover:bg-yellow-400 font-semibold px-4 py-2 rounded-md transition-colors"
                >
                    Add Unit
                </button>
            </form>

            {/* Course Units Display */}
            {units.length === 0 ? (
                <p className="text-gray-500 italic mt-4">No units yet. Add your first unit above.</p>
            ) : (
                <div className="flex flex-col gap-4 mt-4">
                    {units.map((unit) => (
                        <div key={unit.id} className="border border-gray-200 rounded-md p-4 bg-slate-50 relative group shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-center border-b pb-2 mb-2">
                                <h3 className="font-bold text-lg text-gray-800">{unit.title}</h3>
                                <div className="flex gap-2">
                                    <button className="text-xs text-blue-500 hover:bg-blue-100 px-2 py-1 rounded">Edit</button>
                                    <button className="text-xs text-red-500 hover:bg-red-100 px-2 py-1 rounded">Delete</button>
                                </div>
                            </div>

                            {/* Lessons inside unit */}
                            <div className="flex flex-col gap-2 ml-4">
                                {unit.lessons.length === 0 ? (
                                    <p className="text-xs text-gray-400">No lessons attached. Go to the Lessons page to assign them here.</p>
                                ) : (
                                    unit.lessons.map(lesson => (
                                        <div key={lesson.id} className="bg-white p-2 rounded border border-gray-100 shadow-sm flex justify-between">
                                            <span className="text-sm font-medium">{lesson.name}</span>
                                            <span className="text-xs bg-lamaPurpleLight px-2 py-1 rounded-full text-lamaPurple font-semibold">
                                                {lesson.materials.length} Materials
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CourseBuilderClient;
