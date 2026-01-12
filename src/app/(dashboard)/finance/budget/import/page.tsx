import { ensurePermission } from "@/lib/authz";
import { ImportBudgetCsvForm } from "@/components/forms/ImportBudgetCsvForm";

export default async function BudgetImportPage() {
  await ensurePermission(["budget.write"]);

  return (
    <div className="p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Import 2024 Budget from CSV</h1>
        <p className="text-sm text-gray-600">
          Paste the CSV content for the 2024 budget. Amounts are assumed to be in KES major units and
          will be stored as minor units.
        </p>
      </div>
      <ImportBudgetCsvForm />
    </div>
  );
}
