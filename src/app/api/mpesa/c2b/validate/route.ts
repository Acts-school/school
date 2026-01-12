import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const c2bValidationSchema = z.object({
  TransID: z.string().optional(),
});

export type C2bValidationBody = z.infer<typeof c2bValidationSchema>;

// Daraja C2B ValidationURL: we currently accept all transactions.
export async function POST(req: NextRequest): Promise<NextResponse<{ ResultCode: string; ResultDesc: string }>> {
  try {
    const json = (await req.json()) as unknown;
    const _parsed = c2bValidationSchema.safeParse(json);
    // We ignore validation details for now and accept all; add business rules later if needed.
  } catch {
    // If parsing fails, still respond with success so Safaricom does not keep retrying.
  }

  return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
}
