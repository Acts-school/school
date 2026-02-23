"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";

type Material = {
    id: number;
    title: string;
    type: string;
    url?: string;
    content?: string;
};

const MaterialManager = ({
    lessonId,
    initialMaterials,
    onUpdate,
}: {
    lessonId: number;
    initialMaterials: Material[];
    onUpdate: () => void;
}) => {
    const [materials, setMaterials] = useState<Material[]>(initialMaterials);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        type: "PDF",
        url: "",
        content: "",
    });

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/lessonMaterials/${id}`, { method: "DELETE" });
            if (res.ok) {
                setMaterials((prev) => prev.filter((m) => m.id !== id));
                toast.success("Material deleted");
                onUpdate();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            toast.error("Could not delete material");
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return;

        try {
            const res = await fetch("/api/lessonMaterials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, lessonId }),
            });
            if (res.ok) {
                const newMaterial = await res.json();
                setMaterials((prev) => [...prev, newMaterial.data]);
                setShowForm(false);
                setFormData({ title: "", type: "PDF", url: "", content: "" });
                toast.success("Material added");
                onUpdate();
            } else {
                throw new Error("Failed to create");
            }
        } catch (error) {
            toast.error("Could not add material");
        }
    };

    return (
        <div className="mt-2 text-sm border-t pt-2">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-700">Learning Materials</h4>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="text-xs bg-lamaSky text-white px-2 py-1 rounded"
                >
                    {showForm ? "Cancel" : "+ Add Material"}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-gray-50 p-3 rounded-md mb-3 flex flex-col gap-2 border">
                    <input
                        type="text"
                        placeholder="Material Title"
                        className="p-2 border rounded text-xs"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                    <div className="flex gap-2">
                        <select
                            className="p-2 border rounded text-xs w-1/3"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="PDF">PDF</option>
                            <option value="VIDEO">Video</option>
                            <option value="DOCUMENT">Document</option>
                            <option value="LINK">External Link</option>
                            <option value="TEXT">Rich Text</option>
                        </select>
                        <input
                            type="text"
                            placeholder={formData.type === "TEXT" ? "Enter text content..." : "URL / Link..."}
                            className="p-2 border rounded text-xs flex-1"
                            value={formData.type === "TEXT" ? formData.content : formData.url}
                            onChange={(e) =>
                                formData.type === "TEXT"
                                    ? setFormData({ ...formData, content: e.target.value })
                                    : setFormData({ ...formData, url: e.target.value })
                            }
                        />
                    </div>
                    <button type="submit" className="bg-lamaYellow py-1 rounded text-xs font-semibold hover:bg-yellow-400">
                        Save Material
                    </button>
                </form>
            )}

            {materials.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No materials uploaded.</p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {materials.map((mat) => (
                        <li key={mat.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white ${mat.type === "VIDEO" ? "bg-red-400" : mat.type === "PDF" ? "bg-red-600" : "bg-blue-400"
                                    }`}>
                                    {mat.type}
                                </span>
                                <span className="font-medium text-gray-700">{mat.title}</span>
                            </div>
                            <div className="flex gap-2 text-xs">
                                {mat.url && (
                                    <a href={mat.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                                        View
                                    </a>
                                )}
                                <button onClick={() => handleDelete(mat.id)} className="text-red-500 hover:text-red-700">
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MaterialManager;
