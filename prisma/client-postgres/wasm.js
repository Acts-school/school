
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.20.0
 * Query Engine version: 06fc58a368dc7be9fbbbe894adf8d445d208c284
 */
Prisma.prismaVersion = {
  client: "5.20.0",
  engine: "06fc58a368dc7be9fbbbe894adf8d445d208c284"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.StudentPhoneAliasScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  phone: 'phone',
  createdAt: 'createdAt'
};

exports.Prisma.FeeCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isRecurring: 'isRecurring',
  frequency: 'frequency',
  isEditable: 'isEditable',
  active: 'active'
};

exports.Prisma.ClassFeeStructureScalarFieldEnum = {
  id: 'id',
  classId: 'classId',
  feeCategoryId: 'feeCategoryId',
  term: 'term',
  academicYear: 'academicYear',
  amount: 'amount',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorUserId: 'actorUserId',
  entity: 'entity',
  entityId: 'entityId',
  oldValue: 'oldValue',
  newValue: 'newValue',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.SchoolPaymentInfoScalarFieldEnum = {
  id: 'id',
  name: 'name',
  data: 'data',
  createdAt: 'createdAt'
};

exports.Prisma.SmsNotificationScalarFieldEnum = {
  id: 'id',
  toPhone: 'toPhone',
  body: 'body',
  status: 'status',
  provider: 'provider',
  externalId: 'externalId',
  errorMessage: 'errorMessage',
  kind: 'kind',
  relatedId: 'relatedId',
  createdAt: 'createdAt',
  sentAt: 'sentAt'
};

exports.Prisma.SchoolSettingsScalarFieldEnum = {
  id: 'id',
  schoolName: 'schoolName',
  currentAcademicYear: 'currentAcademicYear',
  currentTerm: 'currentTerm',
  passingScore: 'passingScore',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolUserScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  userId: 'userId',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  role: 'role',
  theme: 'theme',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdminScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  staffId: 'staffId'
};

exports.Prisma.AccountantScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  staffId: 'staffId'
};

exports.Prisma.StudentScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  name: 'name',
  surname: 'surname',
  email: 'email',
  phone: 'phone',
  address: 'address',
  img: 'img',
  bloodType: 'bloodType',
  sex: 'sex',
  createdAt: 'createdAt',
  status: 'status',
  parentId: 'parentId',
  classId: 'classId',
  gradeId: 'gradeId',
  birthday: 'birthday',
  admissionYear: 'admissionYear',
  admissionLevel: 'admissionLevel',
  admissionSerial: 'admissionSerial'
};

exports.Prisma.TeacherScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  staffId: 'staffId',
  name: 'name',
  surname: 'surname',
  email: 'email',
  phone: 'phone',
  address: 'address',
  img: 'img',
  bloodType: 'bloodType',
  sex: 'sex',
  createdAt: 'createdAt',
  birthday: 'birthday'
};

exports.Prisma.ImageAssetScalarFieldEnum = {
  id: 'id',
  mimeType: 'mimeType',
  data: 'data',
  createdAt: 'createdAt'
};

exports.Prisma.ParentScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  name: 'name',
  surname: 'surname',
  email: 'email',
  phone: 'phone',
  address: 'address',
  createdAt: 'createdAt',
  schoolId: 'schoolId'
};

exports.Prisma.StudentParentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  parentId: 'parentId',
  relationship: 'relationship',
  isPrimary: 'isPrimary'
};

exports.Prisma.StaffScalarFieldEnum = {
  id: 'id',
  staffCode: 'staffCode',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  address: 'address',
  dateOfBirth: 'dateOfBirth',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone',
  role: 'role',
  employmentDate: 'employmentDate',
  terminationDate: 'terminationDate',
  active: 'active',
  basicSalary: 'basicSalary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GradeScalarFieldEnum = {
  id: 'id',
  level: 'level',
  stage: 'stage'
};

exports.Prisma.ClassScalarFieldEnum = {
  id: 'id',
  name: 'name',
  capacity: 'capacity',
  schoolId: 'schoolId',
  supervisorId: 'supervisorId',
  gradeId: 'gradeId',
  pathway: 'pathway'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.UnitScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  subjectId: 'subjectId',
  classId: 'classId',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LearningAreaScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  stage: 'stage',
  gradeLevel: 'gradeLevel'
};

exports.Prisma.StrandScalarFieldEnum = {
  id: 'id',
  learningAreaId: 'learningAreaId',
  name: 'name',
  code: 'code'
};

exports.Prisma.SubStrandScalarFieldEnum = {
  id: 'id',
  strandId: 'strandId',
  name: 'name',
  code: 'code'
};

exports.Prisma.SpecificLearningOutcomeScalarFieldEnum = {
  id: 'id',
  subStrandId: 'subStrandId',
  code: 'code',
  description: 'description'
};

exports.Prisma.RubricScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  stage: 'stage',
  gradeLevel: 'gradeLevel',
  active: 'active'
};

exports.Prisma.RubricCriterionScalarFieldEnum = {
  id: 'id',
  rubricId: 'rubricId',
  level: 'level',
  descriptor: 'descriptor'
};

exports.Prisma.LessonScalarFieldEnum = {
  id: 'id',
  name: 'name',
  day: 'day',
  startTime: 'startTime',
  endTime: 'endTime',
  subjectId: 'subjectId',
  classId: 'classId',
  teacherId: 'teacherId',
  unitId: 'unitId',
  order: 'order'
};

exports.Prisma.LessonMaterialScalarFieldEnum = {
  id: 'id',
  title: 'title',
  type: 'type',
  url: 'url',
  content: 'content',
  lessonId: 'lessonId',
  createdAt: 'createdAt'
};

exports.Prisma.LessonProgressScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  lessonId: 'lessonId',
  completed: 'completed',
  completedAt: 'completedAt'
};

exports.Prisma.ExamScalarFieldEnum = {
  id: 'id',
  title: 'title',
  startTime: 'startTime',
  endTime: 'endTime',
  lessonId: 'lessonId',
  kind: 'kind',
  cbcGateType: 'cbcGateType',
  term: 'term',
  academicYear: 'academicYear',
  durationMinutes: 'durationMinutes'
};

exports.Prisma.AssignmentScalarFieldEnum = {
  id: 'id',
  title: 'title',
  startDate: 'startDate',
  dueDate: 'dueDate',
  lessonId: 'lessonId',
  kind: 'kind',
  term: 'term',
  academicYear: 'academicYear',
  clientRequestId: 'clientRequestId',
  createdFromOffline: 'createdFromOffline'
};

exports.Prisma.AssignmentSubmissionScalarFieldEnum = {
  id: 'id',
  assignmentId: 'assignmentId',
  studentId: 'studentId',
  fileUrl: 'fileUrl',
  textContent: 'textContent',
  status: 'status',
  submittedAt: 'submittedAt',
  resultId: 'resultId'
};

exports.Prisma.AssessmentCompetencyScalarFieldEnum = {
  id: 'id',
  examId: 'examId',
  assignmentId: 'assignmentId',
  competency: 'competency'
};

exports.Prisma.StudentCompetencyRecordScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  teacherId: 'teacherId',
  competency: 'competency',
  level: 'level',
  term: 'term',
  academicYear: 'academicYear',
  comment: 'comment',
  examId: 'examId',
  assignmentId: 'assignmentId',
  lessonId: 'lessonId',
  createdAt: 'createdAt'
};

exports.Prisma.StudentSloRecordScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  sloId: 'sloId',
  level: 'level',
  term: 'term',
  academicYear: 'academicYear',
  comment: 'comment',
  teacherId: 'teacherId',
  examId: 'examId',
  assignmentId: 'assignmentId',
  lessonId: 'lessonId',
  createdAt: 'createdAt'
};

exports.Prisma.LearningObservationScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  sloId: 'sloId',
  competency: 'competency',
  lessonId: 'lessonId',
  assignmentId: 'assignmentId',
  examId: 'examId',
  teacherId: 'teacherId',
  rubricId: 'rubricId',
  rubricCriterionId: 'rubricCriterionId',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.ResultScalarFieldEnum = {
  id: 'id',
  score: 'score',
  examId: 'examId',
  assignmentId: 'assignmentId',
  studentId: 'studentId',
  clientRequestId: 'clientRequestId',
  createdFromOffline: 'createdFromOffline'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  date: 'date',
  present: 'present',
  studentId: 'studentId',
  lessonId: 'lessonId',
  clientRequestId: 'clientRequestId',
  createdFromOffline: 'createdFromOffline'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  startTime: 'startTime',
  endTime: 'endTime',
  classId: 'classId'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  date: 'date',
  classId: 'classId'
};

exports.Prisma.MessageThreadScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  schoolId: 'schoolId',
  unitId: 'unitId'
};

exports.Prisma.MessageParticipantScalarFieldEnum = {
  id: 'id',
  threadId: 'threadId',
  userId: 'userId',
  lastReadAt: 'lastReadAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  threadId: 'threadId',
  senderUserId: 'senderUserId',
  body: 'body',
  channel: 'channel',
  smsProvider: 'smsProvider',
  smsStatus: 'smsStatus',
  recipientPhone: 'recipientPhone',
  externalId: 'externalId',
  createdAt: 'createdAt'
};

exports.Prisma.FeeStructureScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  amount: 'amount',
  active: 'active',
  gradeId: 'gradeId',
  classId: 'classId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentFeeScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  structureId: 'structureId',
  feeCategoryId: 'feeCategoryId',
  baseAmount: 'baseAmount',
  amountDue: 'amountDue',
  amountPaid: 'amountPaid',
  dueDate: 'dueDate',
  status: 'status',
  term: 'term',
  academicYear: 'academicYear',
  locked: 'locked',
  discountReason: 'discountReason',
  sourceStructureId: 'sourceStructureId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  term: 'term',
  dueDate: 'dueDate',
  totalAmount: 'totalAmount',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  studentFeeId: 'studentFeeId',
  amount: 'amount',
  method: 'method',
  reference: 'reference',
  paidAt: 'paidAt',
  clientRequestId: 'clientRequestId',
  createdFromOffline: 'createdFromOffline'
};

exports.Prisma.StudentFeePaymentAllocationScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  studentFeeId: 'studentFeeId',
  amount: 'amount',
  createdAt: 'createdAt'
};

exports.Prisma.MpesaTransactionScalarFieldEnum = {
  id: 'id',
  studentFeeId: 'studentFeeId',
  paymentId: 'paymentId',
  phoneNumber: 'phoneNumber',
  amount: 'amount',
  status: 'status',
  checkoutRequestId: 'checkoutRequestId',
  merchantRequestId: 'merchantRequestId',
  mpesaReceiptNumber: 'mpesaReceiptNumber',
  rawCallback: 'rawCallback',
  reviewReason: 'reviewReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  title: 'title',
  amount: 'amount',
  category: 'category',
  date: 'date',
  notes: 'notes',
  schoolId: 'schoolId'
};

exports.Prisma.BudgetYearScalarFieldEnum = {
  id: 'id',
  academicYear: 'academicYear',
  label: 'label',
  status: 'status',
  notes: 'notes',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BudgetSectionScalarFieldEnum = {
  id: 'id',
  budgetYearId: 'budgetYearId',
  name: 'name',
  sortOrder: 'sortOrder'
};

exports.Prisma.BudgetItemScalarFieldEnum = {
  id: 'id',
  budgetSectionId: 'budgetSectionId',
  name: 'name',
  kind: 'kind',
  category: 'category',
  notes: 'notes',
  staffId: 'staffId'
};

exports.Prisma.BudgetAmountScalarFieldEnum = {
  id: 'id',
  budgetItemId: 'budgetItemId',
  month: 'month',
  amount: 'amount'
};

exports.Prisma.PayrollPeriodScalarFieldEnum = {
  id: 'id',
  year: 'year',
  month: 'month',
  schoolId: 'schoolId',
  status: 'status',
  createdAt: 'createdAt',
  closedAt: 'closedAt'
};

exports.Prisma.StaffPayrollScalarFieldEnum = {
  id: 'id',
  periodId: 'periodId',
  staffId: 'staffId',
  staffRole: 'staffRole',
  basicSalary: 'basicSalary',
  allowances: 'allowances',
  deductions: 'deductions',
  netPay: 'netPay',
  notes: 'notes',
  status: 'status',
  paidAt: 'paidAt',
  paymentMethod: 'paymentMethod',
  paymentReference: 'paymentReference',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuestionScalarFieldEnum = {
  id: 'id',
  subjectId: 'subjectId',
  type: 'type',
  text: 'text',
  points: 'points',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuestionChoiceScalarFieldEnum = {
  id: 'id',
  questionId: 'questionId',
  text: 'text',
  isCorrect: 'isCorrect'
};

exports.Prisma.ExamQuestionScalarFieldEnum = {
  id: 'id',
  examId: 'examId',
  questionId: 'questionId',
  order: 'order'
};

exports.Prisma.ExamAttemptScalarFieldEnum = {
  id: 'id',
  examId: 'examId',
  studentId: 'studentId',
  startTime: 'startTime',
  endTime: 'endTime',
  status: 'status',
  resultId: 'resultId'
};

exports.Prisma.StudentAnswerScalarFieldEnum = {
  id: 'id',
  attemptId: 'attemptId',
  questionId: 'questionId',
  choiceId: 'choiceId',
  textResponse: 'textResponse',
  isCorrect: 'isCorrect',
  pointsAwarded: 'pointsAwarded'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.FeeFrequency = exports.$Enums.FeeFrequency = {
  TERMLY: 'TERMLY',
  YEARLY: 'YEARLY',
  ONE_TIME: 'ONE_TIME'
};

exports.Term = exports.$Enums.Term = {
  TERM1: 'TERM1',
  TERM2: 'TERM2',
  TERM3: 'TERM3'
};

exports.SmsDeliveryStatus = exports.$Enums.SmsDeliveryStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

exports.SmsNotificationKind = exports.$Enums.SmsNotificationKind = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  EVENT: 'EVENT',
  FEE_REMINDER: 'FEE_REMINDER'
};

exports.ThemePreference = exports.$Enums.ThemePreference = {
  SYSTEM: 'SYSTEM',
  LIGHT: 'LIGHT',
  DARK: 'DARK'
};

exports.UserSex = exports.$Enums.UserSex = {
  MALE: 'MALE',
  FEMALE: 'FEMALE'
};

exports.StudentStatus = exports.$Enums.StudentStatus = {
  ACTIVE: 'ACTIVE',
  LEFT: 'LEFT',
  ALUMNI: 'ALUMNI'
};

exports.StaffRole = exports.$Enums.StaffRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
  NON_TEACHING: 'NON_TEACHING',
  SUPPORT: 'SUPPORT',
  OTHER: 'OTHER'
};

exports.EducationStage = exports.$Enums.EducationStage = {
  PRE_PRIMARY: 'PRE_PRIMARY',
  LOWER_PRIMARY: 'LOWER_PRIMARY',
  UPPER_PRIMARY: 'UPPER_PRIMARY',
  JUNIOR_SECONDARY: 'JUNIOR_SECONDARY',
  SENIOR_SECONDARY: 'SENIOR_SECONDARY'
};

exports.EducationPathway = exports.$Enums.EducationPathway = {
  STEM: 'STEM',
  ARTS_SPORTS: 'ARTS_SPORTS',
  SOCIAL_SCIENCES: 'SOCIAL_SCIENCES'
};

exports.SloAchievementLevel = exports.$Enums.SloAchievementLevel = {
  BELOW_EXPECTATIONS: 'BELOW_EXPECTATIONS',
  APPROACHING_EXPECTATIONS: 'APPROACHING_EXPECTATIONS',
  MEETING_EXPECTATIONS: 'MEETING_EXPECTATIONS'
};

exports.Day = exports.$Enums.Day = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY'
};

exports.MaterialType = exports.$Enums.MaterialType = {
  VIDEO: 'VIDEO',
  PDF: 'PDF',
  DOCUMENT: 'DOCUMENT',
  TEXT: 'TEXT',
  LINK: 'LINK'
};

exports.AssessmentKind = exports.$Enums.AssessmentKind = {
  FORMATIVE: 'FORMATIVE',
  SUMMATIVE: 'SUMMATIVE',
  NATIONAL_GATE: 'NATIONAL_GATE'
};

exports.CbcGateType = exports.$Enums.CbcGateType = {
  KPSEA: 'KPSEA',
  KILEA: 'KILEA',
  SENIOR_EXIT: 'SENIOR_EXIT'
};

exports.SubmissionStatus = exports.$Enums.SubmissionStatus = {
  SUBMITTED: 'SUBMITTED',
  GRADED: 'GRADED',
  RETURNED: 'RETURNED',
  LATE: 'LATE'
};

exports.CbcCompetency = exports.$Enums.CbcCompetency = {
  COMMUNICATION_COLLABORATION: 'COMMUNICATION_COLLABORATION',
  CRITICAL_THINKING_PROBLEM_SOLVING: 'CRITICAL_THINKING_PROBLEM_SOLVING',
  IMAGINATION_CREATIVITY: 'IMAGINATION_CREATIVITY',
  CITIZENSHIP: 'CITIZENSHIP',
  DIGITAL_LITERACY: 'DIGITAL_LITERACY',
  LEARNING_TO_LEARN: 'LEARNING_TO_LEARN',
  SELF_EFFICACY: 'SELF_EFFICACY'
};

exports.CbcCompetencyLevel = exports.$Enums.CbcCompetencyLevel = {
  EMERGING: 'EMERGING',
  DEVELOPING: 'DEVELOPING',
  PROFICIENT: 'PROFICIENT',
  ADVANCED: 'ADVANCED'
};

exports.MessageChannel = exports.$Enums.MessageChannel = {
  IN_APP: 'IN_APP',
  SMS: 'SMS'
};

exports.InvoiceStatus = exports.$Enums.InvoiceStatus = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  POS: 'POS',
  ONLINE: 'ONLINE',
  MPESA: 'MPESA'
};

exports.MpesaTransactionStatus = exports.$Enums.MpesaTransactionStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
};

exports.MpesaReviewReason = exports.$Enums.MpesaReviewReason = {
  NO_STUDENT: 'NO_STUDENT',
  MULTIPLE_STUDENTS: 'MULTIPLE_STUDENTS',
  NO_FEES: 'NO_FEES',
  OTHER: 'OTHER'
};

exports.BudgetStatus = exports.$Enums.BudgetStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  ARCHIVED: 'ARCHIVED'
};

exports.BudgetItemKind = exports.$Enums.BudgetItemKind = {
  OVERHEAD: 'OVERHEAD',
  STAFF: 'STAFF',
  INCOME: 'INCOME',
  OTHER: 'OTHER'
};

exports.PayrollPeriodStatus = exports.$Enums.PayrollPeriodStatus = {
  OPEN: 'OPEN',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
};

exports.PayrollStatus = exports.$Enums.PayrollStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  PAID: 'PAID'
};

exports.QuestionType = exports.$Enums.QuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  SHORT_ANSWER: 'SHORT_ANSWER'
};

exports.AttemptStatus = exports.$Enums.AttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

exports.Prisma.ModelName = {
  StudentPhoneAlias: 'StudentPhoneAlias',
  FeeCategory: 'FeeCategory',
  ClassFeeStructure: 'ClassFeeStructure',
  AuditLog: 'AuditLog',
  SchoolPaymentInfo: 'SchoolPaymentInfo',
  SmsNotification: 'SmsNotification',
  SchoolSettings: 'SchoolSettings',
  School: 'School',
  SchoolUser: 'SchoolUser',
  UserPreference: 'UserPreference',
  Admin: 'Admin',
  Accountant: 'Accountant',
  Student: 'Student',
  Teacher: 'Teacher',
  ImageAsset: 'ImageAsset',
  Parent: 'Parent',
  StudentParent: 'StudentParent',
  Staff: 'Staff',
  Grade: 'Grade',
  Class: 'Class',
  Subject: 'Subject',
  Unit: 'Unit',
  LearningArea: 'LearningArea',
  Strand: 'Strand',
  SubStrand: 'SubStrand',
  SpecificLearningOutcome: 'SpecificLearningOutcome',
  Rubric: 'Rubric',
  RubricCriterion: 'RubricCriterion',
  Lesson: 'Lesson',
  LessonMaterial: 'LessonMaterial',
  LessonProgress: 'LessonProgress',
  Exam: 'Exam',
  Assignment: 'Assignment',
  AssignmentSubmission: 'AssignmentSubmission',
  AssessmentCompetency: 'AssessmentCompetency',
  StudentCompetencyRecord: 'StudentCompetencyRecord',
  StudentSloRecord: 'StudentSloRecord',
  LearningObservation: 'LearningObservation',
  Result: 'Result',
  Attendance: 'Attendance',
  Event: 'Event',
  Announcement: 'Announcement',
  MessageThread: 'MessageThread',
  MessageParticipant: 'MessageParticipant',
  Message: 'Message',
  FeeStructure: 'FeeStructure',
  StudentFee: 'StudentFee',
  Invoice: 'Invoice',
  Payment: 'Payment',
  StudentFeePaymentAllocation: 'StudentFeePaymentAllocation',
  MpesaTransaction: 'MpesaTransaction',
  Expense: 'Expense',
  BudgetYear: 'BudgetYear',
  BudgetSection: 'BudgetSection',
  BudgetItem: 'BudgetItem',
  BudgetAmount: 'BudgetAmount',
  PayrollPeriod: 'PayrollPeriod',
  StaffPayroll: 'StaffPayroll',
  Question: 'Question',
  QuestionChoice: 'QuestionChoice',
  ExamQuestion: 'ExamQuestion',
  ExamAttempt: 'ExamAttempt',
  StudentAnswer: 'StudentAnswer'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
