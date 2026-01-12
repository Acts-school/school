import { getAuthContext } from "@/lib/authz";
import MpesaReviewClient from "@/components/MpesaReviewClient";

export default async function MpesaReviewPage() {
  const ctx = await getAuthContext();

  if (!ctx || (ctx.role !== "admin" && ctx.role !== "accountant")) {
    return null;
  }

  return <MpesaReviewClient />;
}
