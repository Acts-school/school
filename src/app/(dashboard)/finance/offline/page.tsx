import { getAuthContext } from "@/lib/authz";
import FinanceOfflineDiagnosticsClient from "@/components/FinanceOfflineDiagnosticsClient";

export default async function FinanceOfflineDiagnosticsPage() {
  const ctx = await getAuthContext();

  if (!ctx || (ctx.role !== "admin" && ctx.role !== "accountant")) {
    return null;
  }

  return <FinanceOfflineDiagnosticsClient />;
}
