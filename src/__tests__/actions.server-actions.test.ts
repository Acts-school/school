import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { AuthContext } from "@/lib/authz";
import type {
  AnnouncementSchema,
  AssignmentSchema,
  ProfileSchema,
  UserPreferencesSchema,
} from "@/lib/formValidationSchemas";
import type { ThemePreference } from "@prisma/client";
import { revalidatePath } from "next/cache";

type PrismaMock = {
  announcement: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  assignment: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  assessmentCompetency: {
    createMany: (args: unknown) => Promise<unknown>;
    deleteMany: (args: unknown) => Promise<unknown>;
  };
  result: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  teacher: {
    update: (args: unknown) => Promise<unknown>;
  };
  student: {
    update: (args: unknown) => Promise<unknown>;
  };
  parent: {
    update: (args: unknown) => Promise<unknown>;
  };
  schoolSettings: {
    update: (args: unknown) => Promise<unknown>;
  };
  userPreference: {
    upsert: (args: unknown) => Promise<unknown>;
  };
  $transaction: Mock;
};

vi.mock("next/cache", () => ({
  __esModule: true as const,
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const mock: PrismaMock = {
    announcement: {
      create: vi.fn(async (args: unknown) => args),
      update: vi.fn(async (args: unknown) => args),
    },
    assignment: {
      create: vi.fn(async (args: unknown) => args),
      update: vi.fn(async (args: unknown) => args),
    },
    assessmentCompetency: {
      createMany: vi.fn(async (args: unknown) => args),
      deleteMany: vi.fn(async (args: unknown) => args),
    },
    result: {
      create: vi.fn(async (args: unknown) => args),
      update: vi.fn(async (args: unknown) => args),
    },
    teacher: {
      update: vi.fn(async (args: unknown) => args),
    },
    student: {
      update: vi.fn(async (args: unknown) => args),
    },
    parent: {
      update: vi.fn(async (args: unknown) => args),
    },
    schoolSettings: {
      update: vi.fn(async (args: unknown) => args),
    },
    userPreference: {
      upsert: vi.fn(async (args: unknown) => args),
    },
    $transaction: vi.fn(async <T>(fn: (tx: PrismaMock) => Promise<T>): Promise<T> =>
      fn(mock),
    ),
  };

  return {
    __esModule: true as const,
    default: mock,
  };
});

import prisma from "@/lib/prisma";
const prismaMock = prisma as unknown as PrismaMock;

vi.mock("@/lib/authz", () => ({
  __esModule: true as const,
  ensurePermission: vi.fn(),
  getAuthContext: vi.fn(),
}));

import { ensurePermission, getAuthContext } from "@/lib/authz";
import type { Mock } from "vitest";

const ensurePermissionMock = ensurePermission as unknown as Mock;
const getAuthContextMock = getAuthContext as unknown as Mock;

// Import actions after mocks are set up
import {
  createAnnouncement,
  updateAnnouncement,
  createAssignment,
  updateAssignment,
  updateProfile,
  updateUserPreferences,
} from "@/lib/actions";

const defaultState = { success: false, error: false } as const;

beforeEach(() => {
  vi.clearAllMocks();
  ensurePermissionMock.mockResolvedValue(undefined);
  getAuthContextMock.mockResolvedValue(null);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("announcement actions", () => {
  it("createAnnouncement persists data and revalidates list", async () => {
    const data = {
      title: "Test",
      description: "Desc",
      date: new Date("2024-01-01"),
      classId: 1,
    } as AnnouncementSchema;

    const result = await createAnnouncement(defaultState, data);

    expect(ensurePermissionMock).toHaveBeenCalledWith("announcements.write");
    expect(prismaMock.announcement.create).toHaveBeenCalledWith({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: 1,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/list/announcements");
    expect(result).toEqual({ success: true, error: false });
  });

  it("updateAnnouncement updates existing row", async () => {
    const data: AnnouncementSchema = {
      id: 10,
      title: "Updated",
      description: "New desc",
      date: new Date("2024-02-01"),
      // leave classId undefined so the action treats it as null for Prisma
    };

    const result = await updateAnnouncement(defaultState, data);

    expect(ensurePermissionMock).toHaveBeenCalledWith("announcements.write");
    expect(prismaMock.announcement.update).toHaveBeenCalledWith({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: null,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/list/announcements");
    expect(result).toEqual({ success: true, error: false });
  });
});

describe("assignment actions", () => {
  it("createAssignment creates assignment and competencies in a transaction", async () => {
    const data = {
      title: "Assignment",
      startDate: new Date("2024-03-01"),
      dueDate: new Date("2024-03-10"),
      lessonId: 5,
      kind: "SUMMATIVE",
      competencies: [
        "COMMUNICATION_COLLABORATION",
        "CRITICAL_THINKING_PROBLEM_SOLVING",
      ],
    } as AssignmentSchema;

    const result = await createAssignment(defaultState, data);

    expect(ensurePermissionMock).toHaveBeenCalledWith("assignments.write");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, error: false });
  });

  it("updateAssignment rewrites competencies when provided", async () => {
    const data = {
      id: 7,
      title: "Updated assignment",
      startDate: new Date("2024-03-02"),
      dueDate: new Date("2024-03-12"),
      lessonId: 6,
      kind: "FORMATIVE",
      competencies: ["CITIZENSHIP"],
    } as AssignmentSchema;

    const result = await updateAssignment(defaultState, data);

    expect(ensurePermissionMock).toHaveBeenCalledWith("assignments.write");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, error: false });
  });
});

describe("profile and preferences actions", () => {
  it("updateProfile updates teacher profile when role is teacher", async () => {
    const ctx: AuthContext = {
      userId: "teacher-1",
      role: "teacher",
      permissions: [],
    };
    getAuthContextMock.mockResolvedValueOnce(ctx);

    const data = {
      name: "Teacher",
      surname: "One",
      email: "t1@example.com",
      phone: "12345",
      address: "Addr",
    } as ProfileSchema;

    const result = await updateProfile(defaultState, data);

    expect(prismaMock.teacher.update).toHaveBeenCalledWith({
      where: { id: ctx.userId },
      data: {
        name: data.name,
        surname: data.surname,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });
    expect(result).toEqual({ success: true, error: false });
  });

  it("updateUserPreferences upserts preferences for current user", async () => {
    const ctx: AuthContext = {
      userId: "user-1",
      role: "teacher",
      permissions: [],
    };
    getAuthContextMock.mockResolvedValueOnce(ctx);

    const data = {
      theme: "dark",
    } as UserPreferencesSchema;

    const result = await updateUserPreferences(defaultState, data);

    const expectedTheme: ThemePreference = "DARK";

    expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
      where: {
        userId_role: {
          userId: ctx.userId,
          role: ctx.role,
        },
      },
      update: {
        theme: expectedTheme,
      },
      create: {
        userId: ctx.userId,
        role: ctx.role,
        theme: expectedTheme,
      },
    });
    expect(result).toEqual({ success: true, error: false });
  });
});
