import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";

const SNAPSHOT_PATH = "desktop-snapshot.json" as const;
const SQLITE_PATH = "eacts-desktop.db" as const;

interface Snapshot {
  schools: readonly unknown[];
  grades: readonly unknown[];
  classes: readonly unknown[];
  subjects: readonly unknown[];
  staff: readonly unknown[];
  parents: readonly unknown[];
  teachers: readonly unknown[];
  students: readonly unknown[];
  studentParents: readonly unknown[];
  feeCategories: readonly unknown[];
  feeStructures: readonly unknown[];
  classFeeStructures: readonly unknown[];
  invoices: readonly unknown[];
  studentFees: readonly unknown[];
  payments: readonly unknown[];
  allocations: readonly unknown[];
  mpesaTransactions: readonly unknown[];
  lessons: readonly unknown[];
  exams: readonly unknown[];
  assignments: readonly unknown[];
  results: readonly unknown[];
  attendance: readonly unknown[];
}

type SnapshotKey = keyof Snapshot;

const TABLE_NAMES: Record<SnapshotKey, string> = {
  schools: "snapshot_schools",
  grades: "snapshot_grades",
  classes: "snapshot_classes",
  subjects: "snapshot_subjects",
  staff: "snapshot_staff",
  parents: "snapshot_parents",
  teachers: "snapshot_teachers",
  students: "snapshot_students",
  studentParents: "snapshot_student_parents",
  feeCategories: "snapshot_fee_categories",
  feeStructures: "snapshot_fee_structures",
  classFeeStructures: "snapshot_class_fee_structures",
  invoices: "snapshot_invoices",
  studentFees: "snapshot_student_fees",
  payments: "snapshot_payments",
  allocations: "snapshot_allocations",
  mpesaTransactions: "snapshot_mpesa_transactions",
  lessons: "snapshot_lessons",
  exams: "snapshot_exams",
  assignments: "snapshot_assignments",
  results: "snapshot_results",
  attendance: "snapshot_attendance",
} satisfies Record<SnapshotKey, string>;

async function main(): Promise<void> {
  const raw = await readFile(SNAPSHOT_PATH, { encoding: "utf8" });
  const snapshot = JSON.parse(raw) as Snapshot;

  const db = new Database(SQLITE_PATH);

  try {
    db.pragma("journal_mode = WAL");
    db.exec("BEGIN IMMEDIATE TRANSACTION");

    // Create simple per-collection snapshot tables. Each row is stored as JSON
    // so we do not depend on SQLite enum / JSON support.
    (Object.keys(TABLE_NAMES) as SnapshotKey[]).forEach((key) => {
      const table = TABLE_NAMES[key];

      db.exec(
        `CREATE TABLE IF NOT EXISTS ${table} (` +
          "row_index INTEGER PRIMARY KEY, " +
          "data TEXT NOT NULL" +
          ")",
      );

      db.exec(`DELETE FROM ${table}`);
    });

    // Insert snapshot rows as JSON blobs.
    (Object.keys(TABLE_NAMES) as SnapshotKey[]).forEach((key) => {
      const table = TABLE_NAMES[key];
      const rows = snapshot[key];

      if (!Array.isArray(rows)) {
        return;
      }

      const stmt = db.prepare<{ row_index: number; data: string }>(
        `INSERT INTO ${table} (row_index, data) VALUES (@row_index, @data)`,
      );

      const insertMany = db.transaction((items: readonly unknown[]) => {
        items.forEach((item, index) => {
          const json = JSON.stringify(item);
          stmt.run({ row_index: index, data: json });
        });
      });

      insertMany(rows);
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    // eslint-disable-next-line no-console
    console.error("SQLite import failed:", error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("SQLite import top-level error:", error);
  process.exitCode = 1;
});
