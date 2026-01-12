import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";

export type CreateLearningObservationInput = {
  lessonId: number;
  studentIds: string[];
  notes?: string;
};

const createLearningObservation = async (
  input: CreateLearningObservationInput,
): Promise<{ success: boolean; createdCount: number }> => {
  const response = await fetch("/api/learning-observations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = "Failed to save observation";

    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string" && data.error.length > 0) {
        message = data.error;
      }
    } catch {
      // ignore json parse errors and use default message
    }

    throw new Error(message);
  }

  const data = (await response.json()) as { success: boolean; createdCount: number };
  return data;
};

export const useCreateLearningObservation = () => {
  return useMutation({
    mutationFn: createLearningObservation,
    onSuccess: () => {
      toast.success("Observation saved successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast.error(message);
    },
  });
};
