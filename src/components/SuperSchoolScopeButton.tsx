"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SuperSchoolScopeButtonProps {
  schoolId: number;
}

export const SuperSchoolScopeButton = ({ schoolId }: SuperSchoolScopeButtonProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/current-school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId }),
      });

      if (!response.ok) {
        // If the request fails, we silently do nothing for now.
        setIsLoading(false);
        return;
      }

      router.push("/admin");
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="mt-2 self-end text-xs px-3 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isLoading ? "Opening…" : "Open admin for this school"}
    </button>
  );
};
