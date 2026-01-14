import { z } from "zod";

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()), //teacher ids
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity name is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade name is required!" }),
  supervisorId: z.coerce.string().optional(),
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(), // subject ids
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" })
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z
    .string()
    .optional()
    .or(z.literal("")),
  birthday: z.coerce.date().optional(),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  classId: z.coerce.number().min(1, { message: "Class is required!" }),
  parentId: z.string().min(1, { message: "Parent Id is required!" }),
});

export type StudentSchema = z.infer<typeof studentSchema>;

const parentBaseSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string().optional().or(z.literal("")),
});

const parentStudentExtensionSchema = z.object({
  createStudent: z
    .preprocess((value) => (value === "on" ? true : value), z.boolean().optional()),
  studentUsername: z
    .string()
    .min(3, {
      message: "Student username must be at least 3 characters long!",
    })
    .optional()
    .or(z.literal("")),
  studentPassword: z
    .string()
    .min(8, { message: "Student password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  studentName: z.string().min(1, { message: "Student first name is required!" }).optional(),
  studentSurname: z
    .string()
    .min(1, { message: "Student last name is required!" })
    .optional(),
  studentEmail: z
    .string()
    .email({ message: "Invalid student email address!" })
    .optional()
    .or(z.literal("")),
  studentPhone: z
    .string()
    .min(1, { message: "Student phone is required when creating a student!" })
    .optional(),
  studentBloodType: z.string().optional().or(z.literal("")),
  studentBirthday: z.coerce.date().optional(),
  studentSex: z.enum(["MALE", "FEMALE"], {
    message: "Student sex is required!",
  }).optional(),
  studentGradeId: z.coerce.number().optional(),
  studentClassId: z.coerce.number().optional(),
});

export const parentSchema = parentBaseSchema
  .merge(parentStudentExtensionSchema)
  .superRefine((data, ctx) => {
    const isCreate = !data.id;

    if (!isCreate) {
      return;
    }

    if (!data.studentName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Student first name is required when creating a student!",
        path: ["studentName"],
      });
    }

    if (!data.studentSurname) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Student last name is required when creating a student!",
        path: ["studentSurname"],
      });
    }

    if (!data.studentPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Student phone is required when creating a student!",
        path: ["studentPhone"],
      });
    }

    if (!data.studentSex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Student sex is required when creating a student!",
        path: ["studentSex"],
      });
    }

    if (data.studentGradeId === undefined || Number.isNaN(data.studentGradeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Student grade is required when creating a student!",
        path: ["studentGradeId"],
      });
    }

    if (data.studentClassId === undefined || Number.isNaN(data.studentClassId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Student class is required when creating a student!",
        path: ["studentClassId"],
      });
    }
  });

export type ParentSchema = z.infer<typeof parentSchema>;

const assessmentKindEnum = z.enum(["FORMATIVE", "SUMMATIVE", "NATIONAL_GATE"]);

const cbcGateTypeEnum = z.enum(["KPSEA", "KILEA", "SENIOR_EXIT"]);

const cbcCompetencyEnum = z.enum([
  "COMMUNICATION_COLLABORATION",
  "CRITICAL_THINKING_PROBLEM_SOLVING",
  "IMAGINATION_CREATIVITY",
  "CITIZENSHIP",
  "DIGITAL_LITERACY",
  "LEARNING_TO_LEARN",
  "SELF_EFFICACY",
]);

const cbcCompetencyLevelEnum = z.enum([
  "EMERGING",
  "DEVELOPING",
  "PROFICIENT",
  "ADVANCED",
]);

const sloAchievementLevelEnum = z.enum([
  "BELOW_EXPECTATIONS",
  "APPROACHING_EXPECTATIONS",
  "MEETING_EXPECTATIONS",
]);

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
  kind: assessmentKindEnum.optional(),
  cbcGateType: cbcGateTypeEnum.optional(),
  competencies: z.array(cbcCompetencyEnum).optional(),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const attendanceSchema = z.object({
  id: z.coerce.number().optional(),
  date: z.string().min(1, { message: "Date is required!" }),
  present: z.boolean(),
  studentId: z.string().min(1, { message: "Student is required!" }),
  lessonId: z.coerce.number().min(1, { message: "Lesson is required!" }),
});

export type AttendanceSchema = z.infer<typeof attendanceSchema>;

export const lessonSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Lesson name is required!" }),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], {
    message: "Day is required!",
  }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  subjectId: z.coerce.number({ message: "Subject is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
  teacherId: z.string().min(1, { message: "Teacher is required!" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
  kind: assessmentKindEnum.optional(),
  cbcGateType: cbcGateTypeEnum.optional(),
  competencies: z.array(cbcCompetencyEnum).optional(),
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

export const feeStructureSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Title is required!" }),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, { message: "Amount is required!" }),
  classId: z.coerce.number().optional(),
});

export type FeeStructureSchema = z.infer<typeof feeStructureSchema>;

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: z.coerce.number().optional(),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

export const profileSchema = z.object({
  name: z.string().min(1, { message: "Name is required!" }),
  surname: z.string().min(1, { message: "Surname is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
  phone: z
    .string()
    .min(5, { message: "Phone is required!" })
    .optional(),
  address: z.string().min(1, { message: "Address is required!" }),
});

export type ProfileSchema = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, { message: "Current password must be at least 8 characters long!" }),
    newPassword: z
      .string()
      .min(8, { message: "New password must be at least 8 characters long!" }),
    confirmNewPassword: z
      .string()
      .min(8, { message: "Confirm password must be at least 8 characters long!" }),
  })
  .refine(
    (data) => data.newPassword === data.confirmNewPassword,
    {
      message: "Passwords do not match",
      path: ["confirmNewPassword"],
    },
  );

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;

export const schoolSettingsSchema = z.object({
  schoolName: z.string().min(1, { message: "School name is required!" }),
  currentAcademicYear: z
    .coerce.number({ message: "Academic year is required!" })
    .int()
    .min(2000, { message: "Academic year must be at least 2000" }),
  currentTerm: z.enum(["TERM1", "TERM2", "TERM3"]),
  passingScore: z.preprocess(
    (val: unknown) => {
      if (val === "" || val === null || val === undefined) {
        return undefined;
      }
      if (typeof val === "number") {
        return Number.isNaN(val) ? undefined : val;
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    },
    z
      .number({ message: "Passing score must be a number" })
      .min(0, { message: "Passing score must be at least 0" })
      .max(100, { message: "Passing score cannot exceed 100" })
      .optional(),
  ),
});

export type SchoolSettingsSchema = z.infer<typeof schoolSettingsSchema>;

export const userPreferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"], {
    message: "Theme is required!",
  }),
});

export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>;

export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  classId: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
});

export type EventSchema = z.infer<typeof eventSchema>;

export const resultSchema = z
  .object({
    id: z.coerce.number().optional(),
    score: z.coerce.number({ message: "Score is required!" }),
    examId: z.coerce.number().optional(),
    assignmentId: z.coerce.number().optional(),
    studentId: z.string().min(1, { message: "Student is required!" }),
  })
  .refine(
    (data) => {
      const examIdValid = typeof data.examId === "number" && data.examId > 0;
      const assignmentIdValid =
        typeof data.assignmentId === "number" && data.assignmentId > 0;
      return (examIdValid || assignmentIdValid) && !(examIdValid && assignmentIdValid);
    },
    {
      message: "Select either an exam or an assignment, but not both.",
      path: ["examId"],
    },
  );

export type ResultSchema = z.infer<typeof resultSchema>;

export const studentFeePaymentSchema = z.object({
  studentFeeId: z.string().min(1, { message: "Student fee is required!" }),
  amount: z.coerce.number().min(1, { message: "Amount is required!" }),
  method: z.enum(["CASH", "BANK_TRANSFER", "POS", "ONLINE", "MPESA"], {
    message: "Payment method is required!",
  }),
  reference: z.string().optional(),
  clientRequestId: z.string().min(1).optional(),
});

export type StudentFeePaymentSchema = z.infer<typeof studentFeePaymentSchema>;

export const studentCompetencyBatchSchema = z.object({
  term: z.enum(["TERM1", "TERM2", "TERM3"], {
    message: "Term is required!",
  }),
  academicYear: z
    .coerce.number({ message: "Academic year is required!" })
    .int()
    .min(2000, { message: "Academic year must be at least 2000" }),
  competency: cbcCompetencyEnum,
  lessonId: z.coerce.number().optional(),
  examId: z.coerce.number().optional(),
  assignmentId: z.coerce.number().optional(),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1, { message: "Student is required!" }),
        level: cbcCompetencyLevelEnum,
        comment: z.string().optional(),
      }),
    )
    .min(1, { message: "At least one student record is required!" }),
}).refine(
  (data) => {
    const hasLesson = typeof data.lessonId === "number" && data.lessonId > 0;
    const hasExam = typeof data.examId === "number" && data.examId > 0;
    const hasAssignment =
      typeof data.assignmentId === "number" && data.assignmentId > 0;

    const count = Number(hasLesson) + Number(hasExam) + Number(hasAssignment);
    return count <= 1;
  },
  {
    message:
      "Specify at most one context among lesson, exam, or assignment for this batch.",
    path: ["lessonId"],
  },
);

export type StudentCompetencyBatchSchema = z.infer<
  typeof studentCompetencyBatchSchema
>;

export const studentSloBatchSchema = z
  .object({
    term: z.enum(["TERM1", "TERM2", "TERM3"], {
      message: "Term is required!",
    }),
    academicYear: z
      .coerce.number({ message: "Academic year is required!" })
      .int()
      .min(2000, { message: "Academic year must be at least 2000" }),
    sloId: z.coerce.number({ message: "SLO is required!" }),
    lessonId: z.coerce.number().optional(),
    examId: z.coerce.number().optional(),
    assignmentId: z.coerce.number().optional(),
    records: z
      .array(
        z.object({
          studentId: z.string().min(1, { message: "Student is required!" }),
          level: sloAchievementLevelEnum,
          comment: z.string().optional(),
        }),
      )
      .min(1, { message: "At least one student record is required!" }),
  })
  .refine(
    (data) => {
      const hasLesson = typeof data.lessonId === "number" && data.lessonId > 0;
      const hasExam = typeof data.examId === "number" && data.examId > 0;
      const hasAssignment =
        typeof data.assignmentId === "number" && data.assignmentId > 0;

      const count = Number(hasLesson) + Number(hasExam) + Number(hasAssignment);
      return count <= 1;
    },
    {
      message:
        "Specify at most one context among lesson, exam, or assignment for this batch.",
      path: ["lessonId"],
    },
  );

export type StudentSloBatchSchema = z.infer<typeof studentSloBatchSchema>;

export const learningObservationSchema = z
  .object({
    studentId: z.string().min(1, { message: "Student is required!" }),
    sloId: z.coerce.number().optional(),
    competency: cbcCompetencyEnum.optional(),
    lessonId: z.coerce.number().optional(),
    examId: z.coerce.number().optional(),
    assignmentId: z.coerce.number().optional(),
    rubricId: z.coerce.number().optional(),
    rubricCriterionId: z.coerce.number().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasSlo = typeof data.sloId === "number" && data.sloId > 0;
      const hasCompetency = data.competency !== undefined;
      return hasSlo || hasCompetency;
    },
    {
      message: "Specify at least a SLO or a competency for an observation.",
      path: ["sloId"],
    },
  );

export type LearningObservationSchema = z.infer<typeof learningObservationSchema>;
