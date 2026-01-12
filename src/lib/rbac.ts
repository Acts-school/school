export type BaseRole = "admin" | "teacher" | "student" | "parent" | "accountant";

// Extendable permission literal union for initial rollout
export type Permission =
  | "students.read"
  | "students.write"
  | "teachers.read"
  | "teachers.write"
  | "parents.read"
  | "parents.write"
  | "subjects.read"
  | "subjects.write"
  | "classes.read"
  | "classes.write"
  | "lessons.read"
  | "lessons.write"
  | "exams.read"
  | "exams.write"
  | "assignments.read"
  | "assignments.write"
  | "events.read"
  | "events.write"
  | "results.read"
  | "results.write"
  | "attendance.read"
  | "attendance.write"
  | "reports.view_admin"
  | "announcements.read"
  | "announcements.write"
  | "fees.read"
  | "fees.write"
  | "payments.read"
  | "payments.write"
  | "expenses.read"
  | "expenses.write"
  | "payroll.read"
  | "payroll.write"
  | "budget.read"
  | "budget.write"
  | "messages.read"
  | "messages.send"
  | "settings.write";

export type PermissionSet = ReadonlyArray<Permission>;

const ADMIN_PERMISSIONS: PermissionSet = [
  "students.read",
  "students.write",
  "teachers.read",
  "teachers.write",
  "parents.read",
  "parents.write",
  "subjects.read",
  "subjects.write",
  "classes.read",
  "classes.write",
  "lessons.read",
  "lessons.write",
  "exams.read",
  "exams.write",
  "assignments.read",
  "assignments.write",
  "events.read",
  "events.write",
  "results.read",
  "results.write",
  "attendance.read",
  "attendance.write",
  "reports.view_admin",
  "announcements.read",
  "announcements.write",
  "fees.read",
  "fees.write",
  "payments.read",
  "payments.write",
  "expenses.read",
  "expenses.write",
  "payroll.read",
  "payroll.write",
  "budget.read",
  "budget.write",
  "messages.read",
  "messages.send",
  "settings.write",
] as const;

const TEACHER_PERMISSIONS: PermissionSet = [
  "students.read",
  "subjects.read",
  "classes.read",
  "lessons.read",
  "lessons.write",
  "exams.read",
  "exams.write",
  "assignments.read",
  "assignments.write",
  "results.read",
  "results.write",
  "attendance.read",
  "attendance.write",
  "announcements.read",
  "messages.read",
  "messages.send",
] as const;

const STUDENT_PERMISSIONS: PermissionSet = [
  "subjects.read",
  "classes.read",
  "lessons.read",
  "exams.read",
  "assignments.read",
  "events.read",
  "results.read",
  "attendance.read",
  "announcements.read",
  "messages.read",
] as const;

const PARENT_PERMISSIONS: PermissionSet = [
  "students.read",
  "subjects.read",
  "classes.read",
  "lessons.read",
  "exams.read",
  "assignments.read",
  "results.read",
  "attendance.read",
  "announcements.read",
] as const;

const ACCOUNTANT_PERMISSIONS: PermissionSet = [
  "fees.read",
  "fees.write",
  "payments.read",
  "payments.write",
  "expenses.read",
  "expenses.write",
  "payroll.read",
  "payroll.write",
  "budget.read",
  "budget.write",
  "messages.read",
] as const;

export const roleToPermissions = (role: BaseRole): PermissionSet => {
  switch (role) {
    case "admin":
      return ADMIN_PERMISSIONS;
    case "teacher":
      return TEACHER_PERMISSIONS;
    case "student":
      return STUDENT_PERMISSIONS;
    case "parent":
      return PARENT_PERMISSIONS;
    case "accountant":
      return ACCOUNTANT_PERMISSIONS;
    default: {
      const _exhaustiveCheck: never = role;
      return _exhaustiveCheck;
    }
  }
};

export const hasPermission = (
  current: ReadonlyArray<Permission>,
  required: Permission | ReadonlyArray<Permission>
): boolean => {
  const needed = Array.isArray(required) ? required : [required];
  const set = new Set(current);
  return needed.every((perm) => set.has(perm));
};
