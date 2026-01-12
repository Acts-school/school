import { describe, it, expect } from "vitest";
import { routeAccessMap } from "@/lib/settings";

const cases: Array<{ path: string; role: string; allowed: boolean }> = [
  { path: "/admin/dashboard", role: "admin", allowed: true },
  { path: "/admin/dashboard", role: "teacher", allowed: false },
  { path: "/teacher/classes", role: "teacher", allowed: true },
  { path: "/teacher/classes", role: "student", allowed: false },
  { path: "/student/courses", role: "student", allowed: true },
  { path: "/list/teachers", role: "admin", allowed: true },
  { path: "/list/teachers", role: "parent", allowed: false },
  { path: "/list/exams", role: "student", allowed: true },
];

function isAllowed(pathname: string, role: string): boolean {
  for (const [route, allowedRoles] of Object.entries(routeAccessMap)) {
    const routePattern = new RegExp(`^${route}$`);
    if (routePattern.test(pathname)) {
      return allowedRoles.includes(role);
    }
  }
  return true; // default open if no match
}

describe("RBAC routeAccessMap", () => {
  cases.forEach(({ path, role, allowed }) => {
    it(`${role} -> ${path} is ${allowed ? "allowed" : "denied"}` , () => {
      expect(isAllowed(path, role)).toBe(allowed);
    });
  });
});
