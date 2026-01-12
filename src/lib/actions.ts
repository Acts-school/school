"use server";

import { revalidatePath } from "next/cache";
import type {
  AssessmentKind,
  CbcCompetency,
  CbcGateType,
  SloAchievementLevel,
  Term,
  ThemePreference,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  announcementSchema,
  type AnnouncementSchema,
  attendanceSchema,
  type AttendanceSchema,
  classSchema,
  type ClassSchema,
  eventSchema,
  type EventSchema,
  examSchema,
  type ExamSchema,
  lessonSchema,
  type LessonSchema,
  assignmentSchema,
  type AssignmentSchema,
  parentSchema,
  type ParentSchema,
  resultSchema,
  type ResultSchema,
  studentSchema,
  type StudentSchema,
  subjectSchema,
  type SubjectSchema,
  teacherSchema,
  type TeacherSchema,
  profileSchema,
  type ProfileSchema,
  changePasswordSchema,
  type ChangePasswordSchema,
  schoolSettingsSchema,
  type SchoolSettingsSchema,
  userPreferencesSchema,
  type UserPreferencesSchema,
  studentCompetencyBatchSchema,
  type StudentCompetencyBatchSchema,
  studentSloBatchSchema,
  type StudentSloBatchSchema,
  learningObservationSchema,
  type LearningObservationSchema,
} from "./formValidationSchemas";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ensurePermission, getAuthContext, getCurrentSchoolContext } from "@/lib/authz";
import { sendSms } from "@/lib/sms";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";

type CurrentState = {
  success: boolean;
  error: boolean;
  errorMessage?: string;
};

type UniqueEntity = "parent" | "teacher" | "student";

const mapUniqueConstraintErrorForEntity = (
  entity: UniqueEntity,
  err: Prisma.PrismaClientKnownRequestError,
): string => {
  const meta = err.meta as { target?: unknown } | undefined;
  const target = meta?.target ?? null;
  const targetString =
    typeof target === "string"
      ? target
      : Array.isArray(target)
      ? target.join(",")
      : "";

  if (entity === "parent") {
    if (targetString.includes("address")) return "A parent with this ID Number already exists.";
    if (targetString.includes("phone")) return "A parent with this phone number already exists.";
    if (targetString.includes("username")) return "A parent with this username already exists.";
    if (targetString.includes("email")) return "A parent with this email already exists.";
    return "A parent with these unique details already exists.";
  }

  if (entity === "teacher") {
    if (targetString.includes("address")) return "A teacher with this ID Number already exists.";
    if (targetString.includes("phone")) return "A teacher with this phone number already exists.";
    if (targetString.includes("username")) return "A teacher with this username already exists.";
    if (targetString.includes("email")) return "A teacher with this email already exists.";
    return "A teacher with these unique details already exists.";
  }

  // student
  if (targetString.includes("phone")) return "A student with this phone number already exists.";
  if (targetString.includes("username")) return "A student with this username already exists.";
  if (targetString.includes("email")) return "A student with this email already exists.";
  return "A student with these unique details already exists.";
};

type AdmissionNumberParts = {
  username: string;
  admissionYear: number;
  admissionLevel: number;
  admissionSerial: number;
};

const formatAdmissionLevelCode = (gradeLevel: number): string => {
  if (gradeLevel === 1) {
    return "PP1";
  }

  if (gradeLevel === 2) {
    return "PP2";
  }

  const derived = gradeLevel - 2;
  return derived.toString().padStart(2, "0");
};

const generateAdmissionNumberForStudent = async (gradeId: number): Promise<AdmissionNumberParts> => {
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    select: { level: true },
  });

  if (!grade) {
    throw new Error("Grade not found when generating admission number");
  }

  const { academicYear } = await getSchoolSettingsDefaults();

  const yy = academicYear % 100;

  const admissionLevel = grade.level;

  const lastWithSerial = await prisma.student.findFirst({
    where: {
      admissionYear: academicYear,
      admissionLevel,
    },
    orderBy: { admissionSerial: "desc" },
    select: { admissionSerial: true },
  });

  const nextSerial = (lastWithSerial?.admissionSerial ?? 0) + 1;

  const levelPart = formatAdmissionLevelCode(grade.level);
  const serialPart = nextSerial.toString().padStart(3, "0");
  const yearPart = yy.toString().padStart(2, "0");

  const username = `${levelPart}/${serialPart}/${yearPart}`;

  return {
    username,
    admissionYear: academicYear,
    admissionLevel,
    admissionSerial: nextSerial,
  };
};

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    await ensurePermission("subjects.write");

    await prisma.subject.create({
      data: {
        name: data.name,
        ...(data.teachers && data.teachers.length
          ? { teachers: { connect: data.teachers.map((teacherId) => ({ id: teacherId })) } }
          : {}),
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("subjects.write");

    const connectTeachers =
      data.teachers && data.teachers.length > 0
        ? { set: data.teachers.map((teacherId) => ({ id: teacherId })) }
        : { set: [] as Array<{ id: string }> };

    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        teachers: connectTeachers,
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  try {
    await ensurePermission("classes.write");

    await prisma.class.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: data.gradeId,
        ...(data.supervisorId ? { supervisorId: data.supervisorId } : {}),
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("classes.write");

    await prisma.class.update({
      where: { id: data.id },
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: data.gradeId,
        ...(data.supervisorId ? { supervisorId: data.supervisorId } : { supervisorId: null }),
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  try {
    await ensurePermission("teachers.write");

    const passwordToHash = data.password && data.password !== "" ? data.password : "teacher123";
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    const subjectConnections =
      data.subjects && data.subjects.length > 0
        ? {
            subjects: {
              connect: data.subjects.map((subjectId) => ({ id: Number.parseInt(subjectId, 10) })),
            },
          }
        : {};

    await prisma.teacher.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        surname: data.surname,
        email: data.email && data.email !== "" ? data.email : null,
        phone: data.phone ?? null,
        address: data.address,
        img: data.img ?? null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        ...subjectConnections,
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        success: false,
        error: true,
        errorMessage: mapUniqueConstraintErrorForEntity("teacher", err),
      };
    }
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("teachers.write");

    const updateData = {
      username: data.username,
      name: data.name,
      surname: data.surname,
      email: data.email && data.email !== "" ? data.email : null,
      phone: data.phone ?? null,
      address: data.address,
      img: data.img ?? null,
      bloodType: data.bloodType,
      sex: data.sex,
      birthday: data.birthday,
    } as {
      username: string;
      name: string;
      surname: string;
      email: string | null;
      phone: string | null;
      address: string;
      img: string | null;
      bloodType: string;
      sex: "MALE" | "FEMALE";
      birthday: Date;
      password?: string;
      subjects?: { set: Array<{ id: number }> };
    };

    if (data.password && data.password !== "") {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    if (data.subjects) {
      const subjectIds = data.subjects.map((subjectId) => ({ id: Number.parseInt(subjectId, 10) }));
      updateData.subjects = { set: subjectIds };
    }

    await prisma.teacher.update({
      where: { id: data.id },
      data: updateData,
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  try {
    await ensurePermission("parents.write");

    const passwordToHash = data.password && data.password !== "" ? data.password : "parent123";
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    const studentUsername = data.studentUsername;
    const studentName = data.studentName;
    const studentSurname = data.studentSurname;
    const studentBloodType = data.studentBloodType;
    const studentBirthday = data.studentBirthday;
    const studentSex = data.studentSex;
    const studentGradeId = data.studentGradeId;
    const studentClassId = data.studentClassId;

    if (
      !studentName ||
      !studentSurname ||
      !studentBloodType ||
      !studentBirthday ||
      !studentSex ||
      typeof studentGradeId !== "number" ||
      typeof studentClassId !== "number"
    ) {
      return { success: false, error: true };
    }

    const { schoolId } = await getCurrentSchoolContext();

    const classItem = await prisma.class.findUnique({
      where: { id: studentClassId },
      include: {
        _count: { select: { students: true } },
        school: { select: { id: true } },
      },
    });

    if (
      !classItem ||
      (schoolId !== null && classItem.schoolId !== schoolId) ||
      classItem.capacity === classItem._count.students
    ) {
      return { success: false, error: true };
    }

    const studentPasswordToHash =
      data.studentPassword && data.studentPassword !== "" ? data.studentPassword : "student123";
    const studentPasswordHash = await bcrypt.hash(studentPasswordToHash, 10);
    const { academicYear } = await getSchoolSettingsDefaults();

    let studentUsernameToUse = studentUsername && studentUsername !== "" ? studentUsername : null;
    let admissionYear: number | null = null;
    let admissionLevel: number | null = null;
    let admissionSerial: number | null = null;

    if (!studentUsernameToUse) {
      const generated = await generateAdmissionNumberForStudent(studentGradeId);
      studentUsernameToUse = generated.username;
      admissionYear = generated.admissionYear;
      admissionLevel = generated.admissionLevel;
      admissionSerial = generated.admissionSerial;
    }

    let createdStudentId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const parent = await tx.parent.create({
        data: {
          username: data.username,
          password: hashedPassword,
          name: data.name,
          surname: data.surname,
          email: data.email && data.email !== "" ? data.email : null,
          phone: data.phone,
          address: data.address,
        },
      });

      const student = await tx.student.create({
        data: {
          username: studentUsernameToUse ?? "",
          password: studentPasswordHash,
          name: studentName,
          surname: studentSurname,
          email: data.studentEmail && data.studentEmail !== "" ? data.studentEmail : null,
          phone: data.studentPhone ?? null,
          address: "",
          bloodType: studentBloodType,
          sex: studentSex,
          birthday: studentBirthday,
          gradeId: studentGradeId,
          classId: studentClassId,
          parentId: parent.id,
          ...(admissionYear !== null ? { admissionYear } : {}),
          ...(admissionLevel !== null ? { admissionLevel } : {}),
          ...(admissionSerial !== null ? { admissionSerial } : {}),
        },
      });

      createdStudentId = student.id;
    });

    if (createdStudentId !== null) {
      try {
        // eslint-disable-next-line no-console
        console.log("[fees:auto-apply] Triggering auto-fee apply for new student (parent flow)", {
          studentId: createdStudentId,
          classId: studentClassId,
        });
        await applyClassFeeStructuresToStudent({
          studentId: createdStudentId,
          classId: studentClassId,
          academicYear,
        });
      } catch (applyError) {
        // eslint-disable-next-line no-console
        console.log(
          "[fees:auto-apply] Failed to apply class fee structures for new student (parent flow)",
          {
            studentId: createdStudentId,
            classId: studentClassId,
            academicYear,
            error: applyError,
          },
        );
      }
    }

    revalidatePath("/list/parents");
    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const meta = err.meta as { target?: unknown } | undefined;
      const target = meta?.target ?? null;
      const targetString =
        typeof target === "string"
          ? target
          : Array.isArray(target)
          ? target.join(",")
          : "";

      if (targetString.includes("address")) {
        return {
          success: false,
          error: true,
          errorMessage: "A parent with this ID Number already exists.",
        };
      }

      return {
        success: false,
        error: true,
        errorMessage: "A parent with the same unique details already exists.",
      };
    }

    // eslint-disable-next-line no-console
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("parents.write");

    const updateData = {
      username: data.username,
      name: data.name,
      surname: data.surname,
      email: data.email && data.email !== "" ? data.email : null,
      phone: data.phone,
      address: data.address,
    } as {
      username: string;
      name: string;
      surname: string;
      email: string | null;
      phone: string;
      address: string;
      password?: string;
    };

    if (data.password && data.password !== "") {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await prisma.parent.update({
      where: { id: data.id },
      data: updateData,
    });

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err);
    return { success: false, error: true };
  }
};

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema,
) => {
  try {
    await ensurePermission("lessons.write");

    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("lessons.write");

    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema,
) => {
  try {
    await ensurePermission("assignments.write");

    const kind: AssessmentKind = (data.kind ?? "FORMATIVE") as AssessmentKind;
    const competencies = data.competencies ?? [];

    await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          title: data.title,
          startDate: data.startDate,
          dueDate: data.dueDate,
          lessonId: data.lessonId,
          kind,
        },
      });

      if (competencies.length > 0) {
        await tx.assessmentCompetency.createMany({
          data: competencies.map((competency) => ({
            assignmentId: assignment.id,
            competency: competency as CbcCompetency,
          })),
        });
      }
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("assignments.write");

    const assignmentId: number = data.id;
    const kind: AssessmentKind = (data.kind ?? "FORMATIVE") as AssessmentKind;
    const competencies = data.competencies;

    await prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          title: data.title,
          startDate: data.startDate,
          dueDate: data.dueDate,
          lessonId: data.lessonId,
          kind,
        },
      });

      if (competencies !== undefined) {
        await tx.assessmentCompetency.deleteMany({ where: { assignmentId } });

        if (competencies.length > 0) {
          await tx.assessmentCompetency.createMany({
            data: competencies.map((competency) => ({
              assignmentId,
              competency: competency as CbcCompetency,
            })),
          });
        }
      }
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema,
) => {
  try {
    await ensurePermission("announcements.write");

    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: typeof data.classId === "number" ? data.classId : null,
      },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("announcements.write");

    await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: typeof data.classId === "number" ? data.classId : null,
      },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema,
) => {
  try {
    await ensurePermission("events.write");

    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: typeof data.classId === "number" ? data.classId : null,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("events.write");

    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: typeof data.classId === "number" ? data.classId : null,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema,
) => {
  try {
    await ensurePermission("results.write");

    await prisma.result.create({
      data: {
        score: data.score,
        examId: typeof data.examId === "number" ? data.examId : null,
        assignmentId: typeof data.assignmentId === "number" ? data.assignmentId : null,
        studentId: data.studentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await ensurePermission("results.write");

    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        examId: typeof data.examId === "number" ? data.examId : null,
        assignmentId: typeof data.assignmentId === "number" ? data.assignmentId : null,
        studentId: data.studentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateProfile = async (
  currentState: CurrentState,
  data: ProfileSchema,
) => {
  const ctx = await getAuthContext();

  if (!ctx) {
    return { success: false, error: true };
  }

  const { userId, role } = ctx;

  try {
    if (role === "teacher") {
      await prisma.teacher.update({
        where: { id: userId },
        data: {
          name: data.name,
          surname: data.surname,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address,
        },
      });
    } else if (role === "student") {
      await prisma.student.update({
        where: { id: userId },
        data: {
          name: data.name,
          surname: data.surname,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address,
        },
      });
    } else if (role === "parent") {
      await prisma.parent.update({
        where: { id: userId },
        data: {
          name: data.name,
          surname: data.surname,
          email: data.email ?? null,
          phone: data.phone ?? "",
          address: data.address,
        },
      });
    } else {
      return { success: false, error: true };
    }

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const changePassword = async (
  currentState: CurrentState,
  data: ChangePasswordSchema,
) => {
  const ctx = await getAuthContext();

  if (!ctx) {
    return { success: false, error: true };
  }

  const { userId, role } = ctx;

  try {
    let existingPasswordHash: string | null = null;

    if (role === "admin") {
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      existingPasswordHash = admin?.password ?? null;
    } else if (role === "accountant") {
      const accountant = await prisma.accountant.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      existingPasswordHash = accountant?.password ?? null;
    } else if (role === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      existingPasswordHash = teacher?.password ?? null;
    } else if (role === "student") {
      const student = await prisma.student.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      existingPasswordHash = student?.password ?? null;
    } else if (role === "parent") {
      const parent = await prisma.parent.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      existingPasswordHash = parent?.password ?? null;
    }

    if (!existingPasswordHash) {
      return { success: false, error: true };
    }

    const isCurrentValid = await bcrypt.compare(data.currentPassword, existingPasswordHash);

    if (!isCurrentValid) {
      return { success: false, error: false, invalidCurrentPassword: true };
    }

    const newHashedPassword = await bcrypt.hash(data.newPassword, 10);

    if (role === "admin") {
      await prisma.admin.update({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
    } else if (role === "accountant") {
      await prisma.accountant.update({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
    } else if (role === "teacher") {
      await prisma.teacher.update({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
    } else if (role === "student") {
      await prisma.student.update({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
    } else if (role === "parent") {
      await prisma.parent.update({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
    } else {
      return { success: false, error: true };
    }

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSchoolSettings = async (
  currentState: CurrentState,
  data: SchoolSettingsSchema,
) => {
  try {
    await ensurePermission("settings.write");

    await prisma.schoolSettings.update({
      where: { id: 1 },
      data: {
        schoolName: data.schoolName,
        currentAcademicYear: data.currentAcademicYear,
        currentTerm: data.currentTerm as Term,
        passingScore: typeof data.passingScore === "number" ? data.passingScore : null,
      },
    });

    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateUserPreferences = async (
  currentState: CurrentState,
  data: UserPreferencesSchema,
) => {
  const ctx = await getAuthContext();

  if (!ctx) {
    return { success: false, error: true };
  }

  const { userId, role } = ctx;

  const theme: ThemePreference =
    data.theme === "light" ? "LIGHT" : data.theme === "dark" ? "DARK" : "SYSTEM";

  try {
    await prisma.userPreference.upsert({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
      update: {
        theme,
      },
      create: {
        userId,
        role,
        theme,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

type ClassFeeStructureForStudentApplyRow = {
  id: number;
  feeCategoryId: number;
  term: Term | null;
  academicYear: number | null;
  amount: number;
};

type StudentFeeForStudentApplyRow = {
  id: string;
  studentId: string;
  feeCategoryId: number | null;
  term: Term | null;
  academicYear: number | null;
  baseAmount: number | null;
  amountDue: number;
  amountPaid: number;
  locked: boolean;
  status: string;
};

type StudentFeeApplyPrisma = {
  classFeeStructure: {
    findMany: (args: {
      where: { classId: number; academicYear: number };
      select: { id: true; feeCategoryId: true; term: true; academicYear: true; amount: true };
    }) => Promise<ClassFeeStructureForStudentApplyRow[]>;
  };
  studentFee: {
    findFirst: (args: {
      where: {
        studentId: string;
        feeCategoryId: number;
        term: Term | null;
        academicYear: number;
      };
    }) => Promise<StudentFeeForStudentApplyRow | null>;
    create: (args: {
      data: {
        studentId: string;
        feeCategoryId: number;
        term: Term | null;
        academicYear: number;
        baseAmount: number | null;
        amountDue: number;
        amountPaid: number;
        locked: boolean;
        sourceStructureId: number | null;
        status: string;
      };
    }) => Promise<StudentFeeForStudentApplyRow>;
    update: (args: {
      where: { id: string };
      data: {
        baseAmount?: number | null;
        amountDue?: number;
        locked?: boolean;
        status?: string;
        sourceStructureId?: number | null;
      };
    }) => Promise<StudentFeeForStudentApplyRow>;
  };
  $transaction: <T>(ops: ReadonlyArray<Promise<T>>) => Promise<T[]>;
};

const studentFeeApplyPrisma = prisma as unknown as StudentFeeApplyPrisma;

const applyClassFeeStructuresToStudent = async (params: {
  studentId: string;
  classId: number;
  academicYear: number;
}): Promise<void> => {
  const { studentId, classId, academicYear } = params;

  if (!Number.isFinite(academicYear)) {
    return;
  }

  const structures = await studentFeeApplyPrisma.classFeeStructure.findMany({
    where: { classId, academicYear },
    select: { id: true, feeCategoryId: true, term: true, academicYear: true, amount: true },
  });

  if (structures.length === 0) {
    // eslint-disable-next-line no-console
    console.log("[fees:auto-apply] No class fee structures found for student", {
      studentId,
      classId,
      academicYear,
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.log("[fees:auto-apply] Applying class fee structures to student", {
    studentId,
    classId,
    academicYear,
    structureCount: structures.length,
  });

  const ops: Array<Promise<unknown>> = [];

  for (const s of structures) {
    const targetTerm: Term | null = s.term ?? "TERM1";

    const op = (async () => {
      const existing = await studentFeeApplyPrisma.studentFee.findFirst({
        where: {
          studentId,
          feeCategoryId: s.feeCategoryId,
          term: targetTerm,
          academicYear,
        },
      });

      if (!existing) {
        const status = s.amount <= 0 ? "paid" : "unpaid";
        await studentFeeApplyPrisma.studentFee.create({
          data: {
            studentId,
            feeCategoryId: s.feeCategoryId,
            term: targetTerm,
            academicYear,
            baseAmount: s.amount,
            amountDue: s.amount,
            amountPaid: 0,
            locked: false,
            sourceStructureId: s.id,
            status,
          },
        });
        return null as unknown;
      }

      if (existing.amountPaid > s.amount) {
        await studentFeeApplyPrisma.studentFee.update({
          where: { id: existing.id },
          data: {
            locked: true,
            sourceStructureId: s.id,
            baseAmount: s.amount,
            amountDue: s.amount,
            status: "paid",
          },
        });
        return null as unknown;
      }

      if (existing.locked) {
        await studentFeeApplyPrisma.studentFee.update({
          where: { id: existing.id },
          data: {
            sourceStructureId: s.id,
          },
        });
        return null as unknown;
      }

      const newStatus =
        existing.amountPaid === s.amount
          ? "paid"
          : existing.amountPaid > 0
          ? "partially_paid"
          : "unpaid";

      await studentFeeApplyPrisma.studentFee.update({
        where: { id: existing.id },
        data: {
          baseAmount: s.amount,
          amountDue: s.amount,
          locked: existing.locked,
          status: newStatus,
          sourceStructureId: s.id,
        },
      });

      return null as unknown;
    })();

    ops.push(op);
  }

  if (ops.length > 0) {
    await studentFeeApplyPrisma.$transaction(ops);
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    await ensurePermission("students.write");
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    const parent = await prisma.parent.findUnique({
      where: { address: data.parentId },
      select: { id: true },
    });

    if (!parent) {
      return { success: false, error: true };
    }

    const hashedPassword = await bcrypt.hash(data.password || "student123", 10);
    const { academicYear } = await getSchoolSettingsDefaults();

    let usernameToUse = data.username && data.username !== "" ? data.username : null;
    let admissionYear: number | null = null;
    let admissionLevel: number | null = null;
    let admissionSerial: number | null = null;

    if (!usernameToUse) {
      const generated = await generateAdmissionNumberForStudent(data.gradeId);
      usernameToUse = generated.username;
      admissionYear = generated.admissionYear;
      admissionLevel = generated.admissionLevel;
      admissionSerial = generated.admissionSerial;
    }

    const student = await prisma.student.create({
      data: {
        username: usernameToUse ?? "",
        password: hashedPassword,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: parent.id,
        ...(admissionYear !== null ? { admissionYear } : {}),
        ...(admissionLevel !== null ? { admissionLevel } : {}),
        ...(admissionSerial !== null ? { admissionSerial } : {}),
      },
    });

    try {
      // eslint-disable-next-line no-console
      console.log("[fees:auto-apply] Triggering auto-fee apply for new student", {
        studentId: student.id,
        classId: data.classId,
      });
      await applyClassFeeStructuresToStudent({
        studentId: student.id,
        classId: data.classId,
        academicYear,
      });
    } catch (applyError) {
      // eslint-disable-next-line no-console
      console.log("[fees:auto-apply] Failed to apply class fee structures for new student", {
        studentId: student.id,
        classId: data.classId,
        academicYear,
        error: applyError,
      });
    }

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        success: false,
        error: true,
        errorMessage: mapUniqueConstraintErrorForEntity("student", err),
      };
    }
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await ensurePermission("students.write");
    const existing = await prisma.student.findUnique({
      where: { id: data.id },
      select: { classId: true },
    });

    const parent = await prisma.parent.findUnique({
      where: { address: data.parentId },
      select: { id: true },
    });

    if (!parent) {
      return { success: false, error: true };
    }

    const updateData: any = {
      name: data.name,
      surname: data.surname,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address,
      img: data.img || null,
      bloodType: data.bloodType,
      sex: data.sex,
      birthday: data.birthday,
      gradeId: data.gradeId,
      classId: data.classId,
      parentId: parent.id,
    };

    // Agar yangi parol kiritilgan bo'lsa
    if (data.password && data.password !== "") {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: updateData,
    });

    if (existing && typeof existing.classId === "number" && existing.classId !== data.classId) {
      const { academicYear } = await getSchoolSettingsDefaults();
      try {
        // eslint-disable-next-line no-console
        console.log("[fees:auto-apply] Triggering auto-fee apply after class change", {
          studentId: data.id,
          oldClassId: existing.classId,
          newClassId: data.classId,
        });
        await applyClassFeeStructuresToStudent({
          studentId: data.id,
          classId: data.classId,
          academicYear,
        });
      } catch (applyError) {
        // eslint-disable-next-line no-console
        console.log("[fees:auto-apply] Failed to apply class fee structures after class change", {
          studentId: data.id,
          oldClassId: existing.classId,
          newClassId: data.classId,
          academicYear,
          error: applyError,
        });
      }
    }

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    await ensurePermission("exams.write");
    const kind: AssessmentKind = (data.kind ?? "FORMATIVE") as AssessmentKind;
    const cbcGateType =
      data.cbcGateType !== undefined ? (data.cbcGateType as CbcGateType) : null;

    const competencies = data.competencies ?? [];

    await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          lessonId: data.lessonId,
          kind,
          ...(cbcGateType !== null ? { cbcGateType } : {}),
        },
      });

      if (competencies.length > 0) {
        await tx.assessmentCompetency.createMany({
          data: competencies.map((competency) => ({
            examId: exam.id,
            competency: competency as CbcCompetency,
          })),
        });
      }
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await ensurePermission("exams.write");
    const examId: number = data.id;
    const kind: AssessmentKind = (data.kind ?? "FORMATIVE") as AssessmentKind;
    const cbcGateType =
      data.cbcGateType !== undefined ? (data.cbcGateType as CbcGateType) : null;

    const competencies = data.competencies;

    await prisma.$transaction(async (tx) => {
      await tx.exam.update({
        where: {
          id: examId,
        },
        data: {
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          lessonId: data.lessonId,
          kind,
          ...(cbcGateType !== null ? { cbcGateType } : {}),
        },
      });

      if (competencies !== undefined) {
        await tx.assessmentCompetency.deleteMany({ where: { examId: examId } });

        if (competencies.length > 0) {
          await tx.assessmentCompetency.createMany({
            data: competencies.map((competency) => ({
              examId: examId,
              competency: competency as CbcCompetency,
            })),
          });
        }
      }
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await ensurePermission("exams.write");
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// ATTENDANCE

export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  try {
    await ensurePermission("attendance.write");
    await prisma.attendance.create({
      data: {
        date: new Date(data.date),
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await ensurePermission("attendance.write");
    await prisma.attendance.update({
      where: {
        id: data.id,
      },
      data: {
        date: new Date(data.date),
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await ensurePermission("attendance.write");
    await prisma.attendance.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const saveStudentCompetencies = async (
  currentState: CurrentState,
  data: StudentCompetencyBatchSchema,
) => {
  const ctx = await getAuthContext();

  if (!ctx || ctx.role !== "teacher") {
    return { success: false, error: true } as const;
  }

  const teacherId = ctx.userId;

  const parseResult = studentCompetencyBatchSchema.safeParse(data);
  if (!parseResult.success) {
    return { success: false, error: true } as const;
  }

  const {
    academicYear,
    term,
    competency,
    lessonId,
    examId,
    assignmentId,
    records,
  } = parseResult.data;

  try {
    // Reuse results.write permission for competency recording
    await ensurePermission("results.write");

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        // Remove any existing record for the same student + competency + term + year + context
        await tx.studentCompetencyRecord.deleteMany({
          where: {
            studentId: record.studentId,
            competency: competency as CbcCompetency,
            term,
            academicYear,
            ...(typeof lessonId === "number" && lessonId > 0 ? { lessonId } : {}),
            ...(typeof examId === "number" && examId > 0 ? { examId } : {}),
            ...(typeof assignmentId === "number" && assignmentId > 0
              ? { assignmentId }
              : {}),
          },
        });

        // Insert the new record
        await tx.studentCompetencyRecord.create({
          data: {
            studentId: record.studentId,
            teacherId,
            competency: competency as CbcCompetency,
            level: record.level,
            term,
            academicYear,
            comment: record.comment ?? null,
            ...(typeof lessonId === "number" && lessonId > 0 ? { lessonId } : {}),
            ...(typeof examId === "number" && examId > 0 ? { examId } : {}),
            ...(typeof assignmentId === "number" && assignmentId > 0
              ? { assignmentId }
              : {}),
          },
        });

        // Record an observation linked to this competency judgement for traceability
        await tx.learningObservation.create({
          data: {
            studentId: record.studentId,
            competency: competency as CbcCompetency,
            ...(typeof lessonId === "number" && lessonId > 0 ? { lessonId } : {}),
            ...(typeof examId === "number" && examId > 0 ? { examId } : {}),
            ...(typeof assignmentId === "number" && assignmentId > 0
              ? { assignmentId }
              : {}),
            teacherId,
            notes: record.comment ?? null,
          },
        });
      }
    });

    return { success: true, error: false } as const;
  } catch (err) {
    console.log(err);
    return { success: false, error: true } as const;
  }
};

export const saveStudentSloRecords = async (
  currentState: CurrentState,
  data: StudentSloBatchSchema,
) => {
  const ctx = await getAuthContext();

  if (!ctx || ctx.role !== "teacher") {
    return { success: false, error: true } as const;
  }

  const teacherId = ctx.userId;

  const parseResult = studentSloBatchSchema.safeParse(data);
  if (!parseResult.success) {
    return { success: false, error: true } as const;
  }

  const { academicYear, term, sloId, lessonId, examId, assignmentId, records } =
    parseResult.data;

  try {
    // Reuse results.write permission for SLO recording
    await ensurePermission("results.write");

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        await tx.studentSloRecord.deleteMany({
          where: {
            studentId: record.studentId,
            sloId,
            term,
            academicYear,
            ...(typeof lessonId === "number" && lessonId > 0 ? { lessonId } : {}),
            ...(typeof examId === "number" && examId > 0 ? { examId } : {}),
            ...(typeof assignmentId === "number" && assignmentId > 0
              ? { assignmentId }
              : {}),
          },
        });

        await tx.studentSloRecord.create({
          data: {
            studentId: record.studentId,
            sloId,
            teacherId,
            level: record.level,
            term,
            academicYear,
            comment: record.comment ?? null,
            ...(typeof lessonId === "number" && lessonId > 0 ? { lessonId } : {}),
            ...(typeof examId === "number" && examId > 0 ? { examId } : {}),
            ...(typeof assignmentId === "number" && assignmentId > 0
              ? { assignmentId }
              : {}),
          },
        });

        // Record an observation linked to this SLO judgement for traceability
        await tx.learningObservation.create({
          data: {
            studentId: record.studentId,
            sloId,
            ...(typeof lessonId === "number" && lessonId > 0 ? { lessonId } : {}),
            ...(typeof examId === "number" && examId > 0 ? { examId } : {}),
            ...(typeof assignmentId === "number" && assignmentId > 0
              ? { assignmentId }
              : {}),
            teacherId,
            notes: record.comment ?? null,
          },
        });
      }
    });

    return { success: true, error: false } as const;
  } catch (err) {
    console.log(err);
    return { success: false, error: true } as const;
  }
};

type StudentSloLatestRecord = {
  sloId: number;
  sloCode: string | null;
  sloDescription: string;
  learningAreaName: string;
  strandName: string;
  subStrandName: string;
  level: SloAchievementLevel;
  term: Term;
  academicYear: number;
};

type RubricObservationAggregate = {
  rubricId: number;
  rubricName: string | null;
  rubricCriterionId: number | null;
  criterionLevel: SloAchievementLevel | null;
  criterionDescriptor: string | null;
  count: number;
};

export const getLearningObservationAggregatesByRubric = async (params: {
  studentId?: string;
  teacherId?: string;
  sloId?: number;
  competency?: CbcCompetency;
}): Promise<RubricObservationAggregate[]> => {
  const { studentId, teacherId, sloId, competency } = params;

  const observations = await prisma.learningObservation.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(typeof sloId === "number" && sloId > 0 ? { sloId } : {}),
      ...(competency ? { competency } : {}),
    },
    select: {
      rubric: {
        select: {
          id: true,
          name: true,
        },
      },
      rubricCriterion: {
        select: {
          id: true,
          level: true,
          descriptor: true,
        },
      },
    },
  });

  const aggregates = new Map<string, RubricObservationAggregate>();

  for (const obs of observations) {
    const rId = obs.rubric?.id ?? null;

    if (rId === null) {
      continue;
    }

    const cId = obs.rubricCriterion?.id ?? null;
    const key = `${rId}:${cId === null ? "none" : String(cId)}`;

    const existing = aggregates.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    aggregates.set(key, {
      rubricId: rId,
      rubricName: obs.rubric?.name ?? null,
      rubricCriterionId: cId,
      criterionLevel: obs.rubricCriterion?.level ?? null,
      criterionDescriptor: obs.rubricCriterion?.descriptor ?? null,
      count: 1,
    });
  }

  return Array.from(aggregates.values());
};

export const getLatestStudentSloRecordsForTerm = async (params: {
  studentId: string;
  academicYear: number;
  term: Term;
}): Promise<StudentSloLatestRecord[]> => {
  const { studentId, academicYear, term } = params;

  const records = await prisma.studentSloRecord.findMany({
    where: {
      studentId,
      academicYear,
      term,
    },
    include: {
      slo: {
        include: {
          subStrand: {
            include: {
              strand: {
                include: {
                  learningArea: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const latestBySlo = new Map<number, StudentSloLatestRecord>();

  for (const record of records) {
    const slo = record.slo;
    const subStrand = slo.subStrand;
    const strand = subStrand.strand;
    const learningArea = strand.learningArea;

    if (!latestBySlo.has(slo.id)) {
      latestBySlo.set(slo.id, {
        sloId: slo.id,
        sloCode: slo.code ?? null,
        sloDescription: slo.description,
        learningAreaName: learningArea.name,
        strandName: strand.name,
        subStrandName: subStrand.name,
        level: record.level,
        term: record.term,
        academicYear: record.academicYear,
      });
    }
  }

  return Array.from(latestBySlo.values());
};

export const saveLearningObservation = async (
  currentState: CurrentState,
  data: LearningObservationSchema,
) => {
  const ctx = await getAuthContext();

  if (!ctx || ctx.role !== "teacher") {
    return { success: false, error: true } as const;
  }

  const teacherId = ctx.userId;

  const parseResult = learningObservationSchema.safeParse(data);
  if (!parseResult.success) {
    return { success: false, error: true } as const;
  }

  const {
    studentId,
    sloId,
    competency,
    lessonId,
    examId,
    assignmentId,
    rubricId,
    rubricCriterionId,
    notes,
  } = parseResult.data;

  try {
    await ensurePermission("results.write");

    let effectiveRubricId: number | undefined;
    let effectiveRubricCriterionId: number | undefined;

    if (typeof rubricCriterionId === "number" && rubricCriterionId > 0) {
      const criterion = await prisma.rubricCriterion.findUnique({
        where: { id: rubricCriterionId },
        select: { rubricId: true },
      });

      if (!criterion) {
        return { success: false, error: true } as const;
      }

      const criterionRubricId = criterion.rubricId;

      if (typeof rubricId === "number" && rubricId > 0) {
        if (criterionRubricId !== rubricId) {
          return { success: false, error: true } as const;
        }
        effectiveRubricId = rubricId;
      } else {
        effectiveRubricId = criterionRubricId;
      }

      effectiveRubricCriterionId = rubricCriterionId;
    } else if (typeof rubricId === "number" && rubricId > 0) {
      effectiveRubricId = rubricId;
    }

    await prisma.learningObservation.create({
      data: {
        studentId,
        ...(typeof sloId === "number" && sloId > 0 ? { sloId } : {}),
        ...(competency !== undefined ? { competency: competency as CbcCompetency } : {}),
        ...(typeof lessonId === "number" && lessonId > 0 ? { lessonId } : {}),
        ...(typeof examId === "number" && examId > 0 ? { examId } : {}),
        ...(typeof assignmentId === "number" && assignmentId > 0 ? { assignmentId } : {}),
        ...(typeof effectiveRubricId === "number" && effectiveRubricId > 0
          ? { rubricId: effectiveRubricId }
          : {}),
        ...(typeof effectiveRubricCriterionId === "number" && effectiveRubricCriterionId > 0
          ? { rubricCriterionId: effectiveRubricCriterionId }
          : {}),
        teacherId,
        notes: notes === undefined || notes === "" ? null : notes,
      },
    });

    return { success: true, error: false } as const;
  } catch (err) {
    console.log(err);
    return { success: false, error: true } as const;
  }
};