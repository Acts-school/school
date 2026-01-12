import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";
import type { PaymentMethod } from "@/lib/fees.actions";
import { enqueueOfflinePayment } from "@/lib/financeOfflineQueue";

export interface StudentFeePaymentRow {
  id: number;
  studentFeeId: string | null;
  amount: number; // minor units
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;
}

interface PaymentsApiResponse {
  data: StudentFeePaymentRow[];
}

export interface CreateStudentFeePaymentInput {
  studentFeeId: string;
  amount: number; // KES
  method: PaymentMethod;
  reference?: string;
}

export interface InitiateMpesaPaymentInput {
  studentFeeId: string;
  amount: number; // KES
  phoneNumber: string;
}

export interface MpesaInitiateSuccess {
  id: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
}

const buildCacheKey = (studentFeeId: string): string => {
  return `payments:${studentFeeId}`;
};

const fetchPayments = async (studentFeeId: string): Promise<PaymentsApiResponse> => {
  const params = new URLSearchParams();
  params.set("studentFeeId", studentFeeId);

  const cacheKey = buildCacheKey(studentFeeId);

  try {
    const response = await fetch(`/api/payments?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch payments");
    }

    const data: PaymentsApiResponse = await response.json();

    if (typeof window !== "undefined") {
      void setOfflineCache<PaymentsApiResponse>(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (typeof window !== "undefined") {
      const cached = await getOfflineCache<PaymentsApiResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw error instanceof Error ? error : new Error("Failed to fetch payments");
  }
};

const createPaymentOnline = async (
  input: CreateStudentFeePaymentInput & { clientRequestId: string },
): Promise<StudentFeePaymentRow> => {
  const response = await fetch("/api/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create payment");
  }

  const created: StudentFeePaymentRow = await response.json();
  return created;
};

const generateClientRequestId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `offline-payment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createPayment = async (input: CreateStudentFeePaymentInput): Promise<StudentFeePaymentRow> => {
  const clientRequestId = generateClientRequestId();
  const payload = { ...input, clientRequestId };

  const isBrowser = typeof window !== "undefined";

  if (!isBrowser || navigator.onLine) {
    try {
      return await createPaymentOnline(payload);
    } catch (error) {
      if (!isBrowser) {
        throw error instanceof Error ? error : new Error("Failed to create payment");
      }
      // If we are in the browser but the network request failed, fall through to offline queue.
    }
  }

  if (isBrowser) {
    await enqueueOfflinePayment({
      studentFeeId: input.studentFeeId,
      amount: input.amount,
      method: input.method,
      reference: input.reference ?? null,
      clientRequestId,
    });

    const synthetic: StudentFeePaymentRow = {
      id: -Date.now(),
      studentFeeId: input.studentFeeId,
      amount: Math.round(input.amount * 100),
      method: input.method,
      reference: input.reference ?? null,
      paidAt: new Date().toISOString(),
    };

    return synthetic;
  }

  throw new Error("Failed to create payment");
};

export const usePayments = (studentFeeId: string | null) => {
  return useQuery({
    queryKey: ["payments", studentFeeId],
    queryFn: () => {
      if (!studentFeeId) {
        return Promise.resolve({ data: [] as StudentFeePaymentRow[] });
      }
      return fetchPayments(studentFeeId);
    },
    enabled: !!studentFeeId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payments", variables.studentFeeId] });
      queryClient.invalidateQueries({ queryKey: ["my-student-fees"] });
      queryClient.invalidateQueries({ queryKey: ["student-fees-by-student"] });
      const isBrowser = typeof window !== "undefined";
      const isOfflineLocal = isBrowser && (navigator.onLine === false || data.id <= 0);

      if (isOfflineLocal) {
        toast.success("Payment queued and will sync when you're back online.");
      } else {
        toast.success("Payment recorded successfully!");
      }

      if (variables.studentFeeId) {
        queryClient.setQueryData<PaymentsApiResponse | undefined>(
          ["payments", variables.studentFeeId],
          (old) => {
            const existing = old?.data ?? [];
            return { data: [data, ...existing] };
          },
        );
      }

      const paymentId = data.id;
      if (typeof window !== "undefined" && Number.isFinite(paymentId) && paymentId > 0) {
        const url = `/api/receipts/${paymentId}/pdf`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

const initiateMpesaPayment = async (
  input: InitiateMpesaPaymentInput,
): Promise<MpesaInitiateSuccess> => {
  const response = await fetch("/api/mpesa/initiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to initiate M-Pesa payment");
  }

  const data = (await response.json()) as MpesaInitiateSuccess;
  return data;
};

export const useInitiateMpesaPayment = () => {
  return useMutation({
    mutationFn: initiateMpesaPayment,
    onSuccess: () => {
      toast.success("M-Pesa request sent. Please check your phone.");
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};
