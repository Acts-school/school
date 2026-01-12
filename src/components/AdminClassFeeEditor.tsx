"use client";

import { useEffect, useMemo, useState } from "react";
import { useClasses } from "@/hooks/useClasses";
import { useFeeCategories } from "@/hooks/useFeeCategories";
import {
  useClassFeeStructures,
  useUpsertClassFeeStructures,
  usePreviewFeeApply,
  useApplyFee,
  type Term,
} from "@/hooks/useClassFeeStructures";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { toast } from "react-toastify";

type TermKey = "TERM1" | "TERM2" | "TERM3" | "YEARLY";
const termKeysGrid: ReadonlyArray<TermKey> = ["TERM1", "TERM2", "TERM3"] as const;
const yearlyKey: TermKey = "YEARLY" as const;
const keyToTerm = (k: TermKey): Term | null => (k === "YEARLY" ? null : k);

type GridState = Record<number, Partial<Record<TermKey, number>>>; // categoryId -> term -> KES value

const toKES = (minor?: number | null): number => (typeof minor === "number" ? minor / 100 : 0);
const toMinor = (kes: number): number => Math.round(kes * 100);

export default function AdminClassFeeEditor() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [classId, setClassId] = useState<number | undefined>(undefined);
  const [grid, setGrid] = useState<GridState>({});
  const [scope, setScope] = useState<"all" | "term">("all");
  const [scopeTerm, setScopeTerm] = useState<Term>("TERM1");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [dirty, setDirty] = useState<boolean>(false);

  // Data sources
  const { data: classesData } = useClasses({ page: 1, limit: 50 });
  const classes = useMemo(() => classesData?.data ?? [], [classesData?.data]);
  const { data: catData } = useFeeCategories(true);
  const categories = useMemo(() => catData?.data ?? [], [catData?.data]);

  const structuresParams = useMemo(() => ({
    ...(typeof classId === "number" ? { classId } : {}),
    ...(typeof year === "number" ? { year } : {}),
  }), [classId, year]);
  const { data: structuresData, refetch } = useClassFeeStructures(structuresParams);
  const structures = useMemo(() => structuresData?.data ?? [], [structuresData?.data]);

  const { mutateAsync: upsert, isPending: saving } = useUpsertClassFeeStructures();
  const { mutateAsync: preview, isPending: previewing } = usePreviewFeeApply();
  const { mutateAsync: apply, isPending: applying } = useApplyFee();

  const entityId = useMemo(() => (classId && year ? `${classId}:${year}` : undefined), [classId, year]);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditRows, setAuditRows] = useState<ReadonlyArray<{ id: number; newValue: unknown; oldValue: unknown; createdAt: string | Date }>>([]);
  const { data: auditData, isLoading: auditLoading } = useAuditLogs({ entity: "class_fee_structure", entityId, page: auditPage, limit: 10 });

  // Reset audit pagination on target change
  useEffect(() => {
    setAuditPage(1);
    setAuditRows([]);
  }, [entityId]);

  // Append new page results (dedupe by id)
  useEffect(() => {
    if (!auditData?.data) return;
    setAuditRows((prev) => {
      const seen = new Set(prev.map((r) => r.id));
      const appended = auditData.data.filter((r) => !seen.has(r.id));
      return [...prev, ...appended];
    });
  }, [auditData]);

  // Initialize grid from server data when dependencies change
  useEffect(() => {
    if (!classId || !year) return;
    const next: GridState = {};
    for (const s of structures) {
      const key: TermKey = s.term ?? ("YEARLY" as const);
      if (!next[s.feeCategoryId]) next[s.feeCategoryId] = {};
      next[s.feeCategoryId]![key] = toKES(s.amount);
    }
    setGrid(next);
    setPreviewCount(null);
    setDirty(false);
  }, [classId, year, structures]);

  const handleChange = (categoryId: number, k: TermKey, value: string) => {
    const raw = Number(value);
    const v = Number.isFinite(raw) ? Math.max(raw, 0) : 0;
    setGrid((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] ?? {}),
        [k]: Number.isFinite(v) ? v : 0,
      },
    }));
    setDirty(true);
  };

  // Expected totals for Primary (grades 1–6). Yearly contributes to TERM1 total for display.
  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const gradeLevel: number | undefined = selectedClass?.grade?.level as unknown as number | undefined;
  const expectedTotals: Readonly<{ TERM1: number; TERM2: number; TERM3: number } | null> =
    typeof gradeLevel === "number" && gradeLevel >= 1 && gradeLevel <= 6
      ? { TERM1: 9900, TERM2: 8800, TERM3: 8800 }
      : null;

  // Calculate actual totals (KES) including YEARLY in TERM1, and excluding Term Adjustment if needed
  const termTotals = useMemo(() => {
    const sumFor = (k: TermKey, includeYearly: boolean): number => {
      return categories.reduce((acc, cat) => acc + (grid[cat.id]?.[k] ?? 0), 0) + (includeYearly ? categories.reduce((acc, cat) => acc + (grid[cat.id]?.[yearlyKey] ?? 0), 0) : 0);
    };
    return {
      TERM1: sumFor("TERM1", true),
      TERM2: sumFor("TERM2", false),
      TERM3: sumFor("TERM3", false),
    } as const;
  }, [categories, grid]);

  const termTotalsExcludingAdjustment = useMemo(() => {
    const isAdjustment = (name: string): boolean => name.toLowerCase() === "term adjustment";
    const sumFor = (k: TermKey, includeYearly: boolean): number => {
      const base = categories.reduce((acc, cat) => acc + (isAdjustment(cat.name) ? 0 : (grid[cat.id]?.[k] ?? 0)), 0);
      const yearly = includeYearly ? categories.reduce((acc, cat) => acc + (isAdjustment(cat.name) ? 0 : (grid[cat.id]?.[yearlyKey] ?? 0)), 0) : 0;
      return base + yearly;
    };
    return {
      TERM1: sumFor("TERM1", true),
      TERM2: sumFor("TERM2", false),
      TERM3: sumFor("TERM3", false),
    } as const;
  }, [categories, grid]);

  const onAutoBalance = () => {
    if (!expectedTotals) return;
    const adj = categories.find((c) => c.name.toLowerCase() === "term adjustment");
    if (!adj) return;
    setGrid((prev) => {
      const next: GridState = { ...prev };
      const setFor = (k: TermKey, expected: number) => {
        const need = expected - termTotalsExcludingAdjustment[k as "TERM1" | "TERM2" | "TERM3"];
        const value = Math.max(0, need);
        next[adj.id] = {
          ...(next[adj.id] ?? {}),
          [k]: value,
        };
      };
      setFor("TERM1", expectedTotals.TERM1);
      setFor("TERM2", expectedTotals.TERM2);
      setFor("TERM3", expectedTotals.TERM3);
      return next;
    });
    setDirty(true);
  };

  // Map existing structure rows by (feeCategoryId, termKey)
  const lineByKey = useMemo(() => {
    const m = new Map<string, { id: number; amount: number }>();
    for (const s of structures) {
      const k: TermKey = s.term ?? ("YEARLY" as const);
      m.set(`${s.feeCategoryId}:${k}`, { id: s.id, amount: s.amount });
    }
    return m;
  }, [structures]);

  const [cellSaving, setCellSaving] = useState<Record<string, boolean>>({});

  const onInlineSave = async (categoryId: number, k: TermKey) => {
    if (!classId || !year) return;
    const key = `${categoryId}:${k}`;
    const kes = grid[categoryId]?.[k];
    if (typeof kes !== "number" || !Number.isFinite(kes)) return;
    const amountMinor = toMinor(kes);
    const existing = lineByKey.get(key);
    const serverKesBefore = typeof existing?.amount === "number" ? toKES(existing.amount) : undefined;
    setCellSaving((s) => ({ ...s, [key]: true }));
    try {
      if (existing) {
        const resp = await fetch(`/api/fee-structures/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountMinor }),
        });
        if (!resp.ok) throw new Error("Failed to patch");
      } else {
        const resp = await fetch(`/api/fee-structures`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, year, lines: [{ feeCategoryId: categoryId, term: keyToTerm(k), amountMinor, active: true }] }),
        });
        if (!resp.ok) throw new Error("Failed to upsert line");
      }
      await refetch();
      toast("Line saved");
    } catch (error) {
      // Roll back to previous server value if we know it; otherwise clear the cell
      setGrid((prev) => {
        const currentRow = prev[categoryId] ?? {};
        const nextRow: Partial<Record<TermKey, number>> = { ...currentRow };
        if (typeof serverKesBefore === "number") {
          nextRow[k] = serverKesBefore;
        } else {
          delete nextRow[k];
        }
        return {
          ...prev,
          [categoryId]: nextRow,
        };
      });
      toast("Failed to save line");
    } finally {
      setCellSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const linesPayload = useMemo(() => {
    if (!classId || !year) return null;
    const lines: Array<{ feeCategoryId: number; term: Term | null; amountMinor: number; active?: boolean }> = [];
    for (const cat of categories) {
      const row = grid[cat.id] ?? {};
      const allKeys: ReadonlyArray<TermKey> = [...termKeysGrid, yearlyKey];
      for (const k of allKeys) {
        const kes = row[k];
        if (typeof kes === "number") {
          lines.push({ feeCategoryId: cat.id, term: keyToTerm(k), amountMinor: toMinor(kes), active: true });
        }
      }
    }
    return { classId, year, lines };
  }, [categories, classId, year, grid]);

  const onSave = async () => {
    if (!linesPayload) return;
    try {
      await upsert(linesPayload);
      await refetch();
      setDirty(false);
      toast("Fee structure saved");
    } catch (error) {
      toast("Failed to save fee structure");
    }
  };

  const onPreview = async () => {
    if (!classId || !year) return;
    try {
      const res = await preview({ classId, year, scope, ...(scope === "term" ? { term: scopeTerm } : {}) });
      setPreviewCount(res.count);
      toast(`Preview ready for ${res.count} rows`);
    } catch (error) {
      toast("Failed to preview fee changes");
    }
  };

  const onApply = async () => {
    if (!classId || !year) return;
    try {
      await apply({ classId, year, scope, ...(scope === "term" ? { term: scopeTerm } : {}) });
      setPreviewCount(null);
      toast("Fee changes applied");
    } catch (error) {
      toast("Failed to apply fee changes");
    }
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Class Fee Structure Editor</h2>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            value={classId ?? ""}
            onChange={(e) => setClassId(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col w-full md:w-1/6">
          <label className="text-xs text-gray-500">Academic Year</label>
          <input
            type="number"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.currentTarget.value || now.getFullYear()))}
          />
        </div>

        <div className="flex flex-col w-full md:w-1/6">
          <label className="text-xs text-gray-500">Scope</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            value={scope}
            onChange={(e) => setScope(e.currentTarget.value as "all" | "term")}
          >
            <option value="all">All</option>
            <option value="term">Term only</option>
          </select>
        </div>
        {scope === "term" && (
          <div className="flex flex-col w-full md:w-1/6">
            <label className="text-xs text-gray-500">Term</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
              value={scopeTerm}
              onChange={(e) => setScopeTerm(e.currentTarget.value as Term)}
            >
              <option value="TERM1">TERM1</option>
              <option value="TERM2">TERM2</option>
              <option value="TERM3">TERM3</option>
            </select>
          </div>
        )}

        <div className="flex gap-2 ml-auto items-center">
          <button disabled={!classId || !year || saving} onClick={onSave} className="bg-blue-500 text-white px-3 py-2 rounded-md disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          <button disabled={!classId || !year || previewing || dirty} onClick={onPreview} className="bg-purple-500 text-white px-3 py-2 rounded-md disabled:opacity-50">{previewing ? "Previewing..." : "Preview"}</button>
          <button disabled={!classId || !year || applying || dirty} onClick={onApply} className="bg-green-600 text-white px-3 py-2 rounded-md disabled:opacity-50">{applying ? "Applying..." : "Apply"}</button>
          {dirty && <span className="text-xs text-orange-600">Unsaved changes</span>}
        </div>
      </div>

      {typeof previewCount === "number" && (
        <div className="text-sm text-gray-700 mb-3">Preview will affect {previewCount} student fee rows.</div>
      )}

      <div className="bg-slate-50 border rounded-md p-3 mb-4">
        <div className="font-medium mb-2">Recent Changes (Audit)</div>
        {!entityId && <div className="text-xs text-gray-500">Select a class and year to view audit logs.</div>}
        {entityId && auditLoading && <div className="text-xs text-gray-500">Loading...</div>}
        {entityId && !auditLoading && (
          <>
            <ul className="space-y-2 text-xs">
              {auditRows.map((log) => {
                type AuditShape = { feeCategoryId?: number; term?: string | null; amount?: number; active?: boolean } | null;
                const nv = log.newValue as AuditShape;
                const ov = log.oldValue as AuditShape;
                const summary = nv
                  ? `cat#${nv.feeCategoryId ?? "?"} ${nv.term ?? "YEARLY"} amount=${typeof nv.amount === "number" ? (nv.amount / 100).toFixed(2) : "?"} active=${String(nv.active)}`
                  : "(no details)";
                const ts = typeof log.createdAt === "string" ? new Date(log.createdAt) : log.createdAt;
                const tsISO = ts instanceof Date ? ts.toISOString() : new Date(String(ts)).toISOString();

                const onRevert = () => {
                  if (!ov || typeof ov.feeCategoryId !== "number") return;
                  const k: TermKey = (ov.term ?? "YEARLY") as TermKey;
                  const kes = typeof ov.amount === "number" ? ov.amount / 100 : undefined;
                  setGrid((prev) => ({
                    ...prev,
                    [ov.feeCategoryId!]: {
                      ...(prev[ov.feeCategoryId!] ?? {}),
                      [k]: kes,
                    },
                  }));
                };

                const onRevertAllAtThisTime = () => {
                  // Collect all logs with identical ISO timestamp
                  const group = auditRows.filter((r) => {
                    const rt = typeof r.createdAt === "string" ? new Date(r.createdAt) : r.createdAt;
                    const rISO = rt instanceof Date ? rt.toISOString() : new Date(String(rt)).toISOString();
                    return rISO === tsISO;
                  });
                  setGrid((prev) => {
                    const next: GridState = { ...prev };
                    for (const g of group) {
                      const gOv = g.oldValue as AuditShape;
                      if (!gOv || typeof gOv.feeCategoryId !== "number") continue;
                      const k: TermKey = (gOv.term ?? "YEARLY") as TermKey;
                      const kes = typeof gOv.amount === "number" ? gOv.amount / 100 : undefined;
                      next[gOv.feeCategoryId] = {
                        ...(next[gOv.feeCategoryId] ?? {}),
                        [k]: kes,
                      };
                    }
                    return next;
                  });
                };

                return (
                  <li key={log.id} className="flex items-center justify-between gap-3">
                    <span className="text-gray-700 truncate">{summary}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="px-2 py-1 text-[11px] rounded border bg-white hover:bg-slate-100"
                        onClick={onRevert}
                        title="Revert this line to its previous value"
                      >
                        Revert
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-[11px] rounded border bg-white hover:bg-slate-100"
                        onClick={onRevertAllAtThisTime}
                        title="Revert all lines changed at this timestamp"
                      >
                        Revert all
                      </button>
                      <span className="text-gray-400 text-[11px]">{ts instanceof Date ? ts.toLocaleString() : String(ts)}</span>
                    </div>
                  </li>
                );
              })}
              {auditRows.length === 0 && <li className="text-gray-500">No recent changes.</li>}
            </ul>
            {!!auditData?.pagination && auditData.pagination.page < auditData.pagination.totalPages && (
              <div className="mt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs rounded bg-white border hover:bg-slate-100"
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  View more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">TERM1 (KES)</th>
              <th className="py-2 pr-4">TERM2 (KES)</th>
              <th className="py-2 pr-4">TERM3 (KES)</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const row = grid[cat.id] ?? {};
              return (
                <tr key={cat.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.name}</span>
                      <span
                        className={"mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium " +
                          (cat.frequency === "TERMLY"
                            ? "bg-blue-50 text-blue-700"
                            : cat.frequency === "YEARLY"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-amber-50 text-amber-700")}
                      >
                        {cat.frequency}
                      </span>
                    </div>
                  </td>
                  {termKeysGrid.map((k) => {
                    const key = `${cat.id}:${k}`;
                    const savingOne = Boolean(cellSaving[key]);
                    return (
                      <td key={k} className="py-1 pr-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-32"
                            value={row[k] ?? ""}
                            onChange={(e) => handleChange(cat.id, k, e.currentTarget.value)}
                          />
                          <button
                            type="button"
                            className="px-2 py-1 text-[11px] rounded bg-blue-50 border hover:bg-blue-100 disabled:opacity-50"
                            disabled={!classId || !year || savingOne}
                            onClick={() => onInlineSave(cat.id, k)}
                            title="Save this line"
                          >
                            {savingOne ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Totals row */}
            <tr className="border-t font-medium">
              <td className="py-2 pr-4">Totals (KES)</td>
              {termKeysGrid.map((k) => {
                const total = categories.reduce((acc, cat) => acc + (grid[cat.id]?.[k] ?? 0), 0);
                return (
                  <td key={`total:${k}`} className="py-2 pr-2">{total.toFixed(2)}</td>
                );
              })}
            </tr>
            {expectedTotals && (
              <tr className="text-xs text-gray-700">
                <td className="py-1 pr-4">Expected (KES)</td>
                <td className="py-1 pr-2">{expectedTotals.TERM1.toFixed(2)} (incl. YEARLY)</td>
                <td className="py-1 pr-2">{expectedTotals.TERM2.toFixed(2)}</td>
                <td className="py-1 pr-2">{expectedTotals.TERM3.toFixed(2)}</td>
              </tr>
            )}
            {expectedTotals && (
              <tr className="text-xs">
                <td className="py-1 pr-4">Diff (Totals - Expected)</td>
                <td className={`py-1 pr-2 ${termTotals.TERM1 === expectedTotals.TERM1 ? "text-green-600" : "text-orange-600"}`}>{(termTotals.TERM1 - expectedTotals.TERM1).toFixed(2)}</td>
                <td className={`py-1 pr-2 ${termTotals.TERM2 === expectedTotals.TERM2 ? "text-green-600" : "text-orange-600"}`}>{(termTotals.TERM2 - expectedTotals.TERM2).toFixed(2)}</td>
                <td className={`py-1 pr-2 ${termTotals.TERM3 === expectedTotals.TERM3 ? "text-green-600" : "text-orange-600"}`}>{(termTotals.TERM3 - expectedTotals.TERM3).toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
        {expectedTotals && (
          <div className="mt-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded bg-white border hover:bg-slate-100"
              onClick={onAutoBalance}
            >
              Auto-balance with Term Adjustment
            </button>
          </div>
        )}
      </div>

      {/* Yearly / One-time Section */}
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-4 border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold">Yearly / One-time (applied once, shown under TERM1)</h3>
          <span className="text-xs text-gray-500">Yearly lines are applied once and displayed under Term 1 in the UI.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">YEARLY (KES)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const row = grid[cat.id] ?? {};
                const k: TermKey = yearlyKey;
                const key = `${cat.id}:${k}`;
                const savingOne = Boolean(cellSaving[key]);
                return (
                  <tr key={`yearly:${cat.id}`} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">
                      <div className="flex flex-col">
                        <span>{cat.name}</span>
                        <span
                          className={"mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium " +
                            (cat.frequency === "TERMLY"
                              ? "bg-blue-50 text-blue-700"
                              : cat.frequency === "YEARLY"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-amber-50 text-amber-700")}
                        >
                          {cat.frequency}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-40"
                          value={row[k] ?? ""}
                          onChange={(e) => handleChange(cat.id, k, e.currentTarget.value)}
                        />
                        <button
                          type="button"
                          className="px-2 py-1 text-[11px] rounded bg-blue-50 border hover:bg-blue-100 disabled:opacity-50"
                          disabled={!classId || !year || savingOne}
                          onClick={() => onInlineSave(cat.id, k)}
                          title="Save yearly line"
                        >
                          {savingOne ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t font-medium">
                <td className="py-2 pr-4">Yearly Total (KES)</td>
                <td className="py-2 pr-2">{
                  categories.reduce((acc, cat) => acc + (grid[cat.id]?.[yearlyKey] ?? 0), 0).toFixed(2)
                }</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
