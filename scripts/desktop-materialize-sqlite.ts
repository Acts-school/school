import Database from "better-sqlite3";

const SQLITE_PATH = "eacts-desktop.db" as const;

interface SnapshotSchoolRaw {
  id: unknown;
  name: unknown;
  code: unknown;
  active: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

interface SnapshotSchool {
  id: number;
  name: string;
  code: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SnapshotGradeRaw {
  id: unknown;
  level: unknown;
  stage: unknown;
}

interface SnapshotGrade {
  id: number;
  level: number;
  stage: string | null;
}

interface SnapshotClassRaw {
  id: unknown;
  name: unknown;
  capacity: unknown;
  schoolId: unknown;
  gradeId: unknown;
  pathway: unknown;
}

interface SnapshotClass {
  id: number;
  name: string;
  capacity: number;
  schoolId: number | null;
  gradeId: number;
  pathway: string | null;
}

interface SnapshotFeeCategoryRaw {
  id: unknown;
  name: unknown;
  description: unknown;
  isRecurring: unknown;
  frequency: unknown;
  isEditable: unknown;
  active: unknown;
}

interface SnapshotFeeCategory {
  id: number;
  name: string;
  description: string | null;
  isRecurring: boolean;
  frequency: string;
  isEditable: boolean;
  active: boolean;
}

interface SnapshotClassFeeStructureRaw {
  id: unknown;
  classId: unknown;
  feeCategoryId: unknown;
  term: unknown;
  academicYear: unknown;
  amount: unknown;
  active: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

interface SnapshotClassFeeStructure {
  id: number;
  classId: number;
  feeCategoryId: number;
  term: string | null;
  academicYear: number | null;
  amount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SnapshotStudentFeeRaw {
  id: unknown;
  studentId: unknown;
  feeCategoryId: unknown;
  baseAmount: unknown;
  amountDue: unknown;
  amountPaid: unknown;
  dueDate: unknown;
  status: unknown;
  term: unknown;
  academicYear: unknown;
  locked: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

interface SnapshotStudentFee {
  id: string;
  studentId: string;
  feeCategoryId: number | null;
  baseAmount: number | null;
  amountDue: number;
  amountPaid: number;
  dueDate: string | null;
  status: string;
  term: string | null;
  academicYear: number | null;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SnapshotInvoiceRaw {
  id: unknown;
  studentId: unknown;
  term: unknown;
  dueDate: unknown;
  totalAmount: unknown;
  status: unknown;
  createdAt: unknown;
}

interface SnapshotInvoice {
  id: number;
  studentId: string;
  term: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface SnapshotPaymentRaw {
  id: unknown;
  invoiceId: unknown;
  studentFeeId: unknown;
  amount: unknown;
  method: unknown;
  reference: unknown;
  paidAt: unknown;
  clientRequestId: unknown;
  createdFromOffline: unknown;
}

interface SnapshotPayment {
  id: number;
  invoiceId: number | null;
  studentFeeId: string | null;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
  clientRequestId: string | null;
  createdFromOffline: boolean;
}

interface SnapshotTeacherRaw {
  id: unknown;
  username: unknown;
  name: unknown;
  surname: unknown;
  email: unknown;
  phone: unknown;
  address: unknown;
  img: unknown;
  bloodType: unknown;
  sex: unknown;
  birthday: unknown;
  createdAt: unknown;
}

interface SnapshotTeacher {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  img: string | null;
  bloodType: string;
  sex: string;
  birthday: string;
  createdAt: string;
}

interface SnapshotSubjectRaw {
  id: unknown;
  name: unknown;
}

interface SnapshotSubject {
  id: number;
  name: string;
}

interface SnapshotParentRaw {
  id: unknown;
  username: unknown;
  name: unknown;
  surname: unknown;
  email: unknown;
  phone: unknown;
  address: unknown;
  createdAt: unknown;
}

interface SnapshotParent {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string;
  address: string | null;
  createdAt: string;
}

interface SnapshotStudentRaw {
  id: unknown;
  username: unknown;
  name: unknown;
  surname: unknown;
  email: unknown;
  phone: unknown;
  address: unknown;
  img: unknown;
  bloodType: unknown;
  sex: unknown;
  status: unknown;
  parentId: unknown;
  classId: unknown;
  gradeId: unknown;
  admissionYear: unknown;
  admissionLevel: unknown;
  admissionSerial: unknown;
  createdAt: unknown;
}

interface SnapshotStudent {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  img: string | null;
  bloodType: string | null;
  sex: string;
  status: string;
  parentId: string;
  classId: number;
  gradeId: number;
  admissionYear: number | null;
  admissionLevel: number | null;
  admissionSerial: number | null;
  createdAt: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function toSnapshotSchool(value: unknown): SnapshotSchool {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid school snapshot: not an object");
  }

  const raw = value as SnapshotSchoolRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid school.id");
  if (!isNonEmptyString(raw.name)) throw new Error("Invalid school.name");
  if (!isNonEmptyString(raw.createdAt)) throw new Error("Invalid school.createdAt");
  if (!isNonEmptyString(raw.updatedAt)) throw new Error("Invalid school.updatedAt");

  const code = raw.code === null || raw.code === undefined ? null : String(raw.code);
  if (!isOptionalString(code)) throw new Error("Invalid school.code");

  const active = typeof raw.active === "boolean" ? raw.active : Boolean(raw.active);

  return {
    id: raw.id,
    name: raw.name,
    code,
    active,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toSnapshotGrade(value: unknown): SnapshotGrade {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid grade snapshot: not an object");
  }

  const raw = value as SnapshotGradeRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid grade.id");
  if (typeof raw.level !== "number") throw new Error("Invalid grade.level");

  const stage =
    raw.stage === null || raw.stage === undefined ? null : String(raw.stage);

  if (!isOptionalString(stage)) throw new Error("Invalid grade.stage");

  return {
    id: raw.id,
    level: raw.level,
    stage,
  };
}

function toSnapshotClass(value: unknown): SnapshotClass {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid class snapshot: not an object");
  }

  const raw = value as SnapshotClassRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid class.id");
  if (!isNonEmptyString(raw.name)) throw new Error("Invalid class.name");
  if (typeof raw.capacity !== "number") throw new Error("Invalid class.capacity");
  if (typeof raw.gradeId !== "number") throw new Error("Invalid class.gradeId");

  const schoolId = raw.schoolId === null || raw.schoolId === undefined ? null : Number(raw.schoolId);
  const pathway = raw.pathway === null || raw.pathway === undefined ? null : String(raw.pathway);

  if (!isOptionalNumber(schoolId)) throw new Error("Invalid class.schoolId");
  if (!isOptionalString(pathway)) throw new Error("Invalid class.pathway");

  return {
    id: raw.id,
    name: raw.name,
    capacity: raw.capacity,
    schoolId,
    gradeId: raw.gradeId,
    pathway,
  };
}

function toSnapshotFeeCategory(value: unknown): SnapshotFeeCategory {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid feeCategory snapshot: not an object");
  }

  const raw = value as SnapshotFeeCategoryRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid feeCategory.id");
  if (!isNonEmptyString(raw.name)) throw new Error("Invalid feeCategory.name");
  if (!isNonEmptyString(raw.frequency)) throw new Error("Invalid feeCategory.frequency");

  const description = raw.description === null || raw.description === undefined ? null : String(raw.description);
  if (!isOptionalString(description)) throw new Error("Invalid feeCategory.description");

  const isRecurring = typeof raw.isRecurring === "boolean" ? raw.isRecurring : Boolean(raw.isRecurring);
  const isEditable = typeof raw.isEditable === "boolean" ? raw.isEditable : Boolean(raw.isEditable);
  const active = typeof raw.active === "boolean" ? raw.active : Boolean(raw.active);

  return {
    id: raw.id,
    name: raw.name,
    description,
    isRecurring,
    frequency: raw.frequency,
    isEditable,
    active,
  };
}

function toSnapshotClassFeeStructure(value: unknown): SnapshotClassFeeStructure {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid classFeeStructure snapshot: not an object");
  }

  const raw = value as SnapshotClassFeeStructureRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid classFeeStructure.id");
  if (typeof raw.classId !== "number") throw new Error("Invalid classFeeStructure.classId");
  if (typeof raw.feeCategoryId !== "number") throw new Error("Invalid classFeeStructure.feeCategoryId");
  if (typeof raw.amount !== "number") throw new Error("Invalid classFeeStructure.amount");
  if (!isNonEmptyString(raw.createdAt)) throw new Error("Invalid classFeeStructure.createdAt");
  if (!isNonEmptyString(raw.updatedAt)) throw new Error("Invalid classFeeStructure.updatedAt");

  const term = raw.term === null || raw.term === undefined ? null : String(raw.term);
  const academicYear =
    raw.academicYear === null || raw.academicYear === undefined ? null : Number(raw.academicYear);

  if (!isOptionalString(term)) throw new Error("Invalid classFeeStructure.term");
  if (!isOptionalNumber(academicYear)) throw new Error("Invalid classFeeStructure.academicYear");

  const active = typeof raw.active === "boolean" ? raw.active : Boolean(raw.active);

  return {
    id: raw.id,
    classId: raw.classId,
    feeCategoryId: raw.feeCategoryId,
    term,
    academicYear,
    amount: raw.amount,
    active,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toSnapshotStudentFee(value: unknown): SnapshotStudentFee {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid studentFee snapshot: not an object");
  }

  const raw = value as SnapshotStudentFeeRaw;

  if (!isNonEmptyString(raw.id)) throw new Error("Invalid studentFee.id");
  if (!isNonEmptyString(raw.studentId)) throw new Error("Invalid studentFee.studentId");
  if (typeof raw.amountDue !== "number") throw new Error("Invalid studentFee.amountDue");
  if (typeof raw.amountPaid !== "number") throw new Error("Invalid studentFee.amountPaid");
  if (!isNonEmptyString(raw.status)) throw new Error("Invalid studentFee.status");
  if (!isNonEmptyString(raw.createdAt)) throw new Error("Invalid studentFee.createdAt");
  if (!isNonEmptyString(raw.updatedAt)) throw new Error("Invalid studentFee.updatedAt");

  const feeCategoryId = raw.feeCategoryId === null || raw.feeCategoryId === undefined ? null : Number(raw.feeCategoryId);
  const baseAmount = raw.baseAmount === null || raw.baseAmount === undefined ? null : Number(raw.baseAmount);
  const dueDate = raw.dueDate === null || raw.dueDate === undefined ? null : String(raw.dueDate);
  const term = raw.term === null || raw.term === undefined ? null : String(raw.term);
  const academicYear = raw.academicYear === null || raw.academicYear === undefined ? null : Number(raw.academicYear);

  if (!isOptionalNumber(feeCategoryId)) throw new Error("Invalid studentFee.feeCategoryId");
  if (!isOptionalNumber(baseAmount)) throw new Error("Invalid studentFee.baseAmount");
  if (!isOptionalString(dueDate)) throw new Error("Invalid studentFee.dueDate");
  if (!isOptionalString(term)) throw new Error("Invalid studentFee.term");
  if (!isOptionalNumber(academicYear)) throw new Error("Invalid studentFee.academicYear");

  const locked = typeof raw.locked === "boolean" ? raw.locked : Boolean(raw.locked);

  return {
    id: raw.id,
    studentId: raw.studentId,
    feeCategoryId,
    baseAmount,
    amountDue: raw.amountDue,
    amountPaid: raw.amountPaid,
    dueDate,
    status: raw.status,
    term,
    academicYear,
    locked,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toSnapshotInvoice(value: unknown): SnapshotInvoice {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid invoice snapshot: not an object");
  }

  const raw = value as SnapshotInvoiceRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid invoice.id");
  if (!isNonEmptyString(raw.studentId)) throw new Error("Invalid invoice.studentId");
  if (!isNonEmptyString(raw.term)) throw new Error("Invalid invoice.term");
  if (!isNonEmptyString(raw.dueDate)) throw new Error("Invalid invoice.dueDate");
  if (typeof raw.totalAmount !== "number") throw new Error("Invalid invoice.totalAmount");
  if (!isNonEmptyString(raw.status)) throw new Error("Invalid invoice.status");
  if (!isNonEmptyString(raw.createdAt)) throw new Error("Invalid invoice.createdAt");

  return {
    id: raw.id,
    studentId: raw.studentId,
    term: raw.term,
    dueDate: raw.dueDate,
    totalAmount: raw.totalAmount,
    status: raw.status,
    createdAt: raw.createdAt,
  };
}

function toSnapshotPayment(value: unknown): SnapshotPayment {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid payment snapshot: not an object");
  }

  const raw = value as SnapshotPaymentRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid payment.id");
  if (typeof raw.amount !== "number") throw new Error("Invalid payment.amount");
  if (!isNonEmptyString(raw.method)) throw new Error("Invalid payment.method");
  if (!isNonEmptyString(raw.paidAt)) throw new Error("Invalid payment.paidAt");

  const invoiceId = raw.invoiceId === null || raw.invoiceId === undefined ? null : Number(raw.invoiceId);
  const studentFeeId = raw.studentFeeId === null || raw.studentFeeId === undefined ? null : String(raw.studentFeeId);
  const reference = raw.reference === null || raw.reference === undefined ? null : String(raw.reference);
  const clientRequestId =
    raw.clientRequestId === null || raw.clientRequestId === undefined ? null : String(raw.clientRequestId);

  if (!isOptionalNumber(invoiceId)) throw new Error("Invalid payment.invoiceId");
  if (!isOptionalString(studentFeeId)) throw new Error("Invalid payment.studentFeeId");
  if (!isOptionalString(reference)) throw new Error("Invalid payment.reference");
  if (!isOptionalString(clientRequestId)) throw new Error("Invalid payment.clientRequestId");

  const createdFromOffline =
    typeof raw.createdFromOffline === "boolean" ? raw.createdFromOffline : Boolean(raw.createdFromOffline);

  return {
    id: raw.id,
    invoiceId,
    studentFeeId,
    amount: raw.amount,
    method: raw.method,
    reference,
    paidAt: raw.paidAt,
    clientRequestId,
    createdFromOffline,
  };
}

function toSnapshotTeacher(value: unknown): SnapshotTeacher {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid teacher snapshot: not an object");
  }

  const raw = value as SnapshotTeacherRaw;

  if (!isNonEmptyString(raw.id)) throw new Error("Invalid teacher.id");
  if (!isNonEmptyString(raw.username)) throw new Error("Invalid teacher.username");
  if (!isNonEmptyString(raw.name)) throw new Error("Invalid teacher.name");
  if (!isNonEmptyString(raw.surname)) throw new Error("Invalid teacher.surname");
  if (!isNonEmptyString(raw.address)) throw new Error("Invalid teacher.address");
  if (!isNonEmptyString(raw.bloodType)) throw new Error("Invalid teacher.bloodType");
  if (!isNonEmptyString(raw.sex)) throw new Error("Invalid teacher.sex");
  if (!isNonEmptyString(raw.birthday)) throw new Error("Invalid teacher.birthday");
  if (!isNonEmptyString(raw.createdAt)) throw new Error("Invalid teacher.createdAt");

  const email = raw.email === null || raw.email === undefined ? null : String(raw.email);
  const phone = raw.phone === null || raw.phone === undefined ? null : String(raw.phone);
  const img = raw.img === null || raw.img === undefined ? null : String(raw.img);

  if (!isOptionalString(email)) throw new Error("Invalid teacher.email");
  if (!isOptionalString(phone)) throw new Error("Invalid teacher.phone");
  if (!isOptionalString(img)) throw new Error("Invalid teacher.img");

  return {
    id: raw.id,
    username: raw.username,
    name: raw.name,
    surname: raw.surname,
    email,
    phone,
    address: raw.address,
    img,
    bloodType: raw.bloodType,
    sex: raw.sex,
    birthday: raw.birthday,
    createdAt: raw.createdAt,
  };
}

function toSnapshotSubject(value: unknown): SnapshotSubject {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid subject snapshot: not an object");
  }

  const raw = value as SnapshotSubjectRaw;

  if (typeof raw.id !== "number") throw new Error("Invalid subject.id");
  if (!isNonEmptyString(raw.name)) throw new Error("Invalid subject.name");

  return {
    id: raw.id,
    name: raw.name,
  };
}

function toSnapshotParent(value: unknown): SnapshotParent {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid parent snapshot: not an object");
  }

  const raw = value as SnapshotParentRaw;

  if (!isNonEmptyString(raw.id)) throw new Error("Invalid parent.id");
  if (!isNonEmptyString(raw.username)) throw new Error("Invalid parent.username");
  if (!isNonEmptyString(raw.name)) throw new Error("Invalid parent.name");
  if (!isNonEmptyString(raw.surname)) throw new Error("Invalid parent.surname");
  if (!isNonEmptyString(raw.phone)) throw new Error("Invalid parent.phone");
  if (!isNonEmptyString(raw.createdAt)) throw new Error("Invalid parent.createdAt");

  const email = raw.email === null || raw.email === undefined ? null : String(raw.email);
  const address = raw.address === null || raw.address === undefined ? null : String(raw.address);

  if (!isOptionalString(email)) throw new Error("Invalid parent.email");
  if (!isOptionalString(address)) throw new Error("Invalid parent.address");

  return {
    id: raw.id,
    username: raw.username,
    name: raw.name,
    surname: raw.surname,
    email,
    phone: raw.phone,
    address,
    createdAt: raw.createdAt,
  };
}

function toSnapshotStudent(value: unknown): SnapshotStudent {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid student snapshot: not an object");
  }

  const raw = value as SnapshotStudentRaw;

  if (!isNonEmptyString(raw.id)) throw new Error("Invalid student.id");
  if (!isNonEmptyString(raw.username)) throw new Error("Invalid student.username");
  if (!isNonEmptyString(raw.name)) throw new Error("Invalid student.name");
  if (!isNonEmptyString(raw.surname)) throw new Error("Invalid student.surname");
  if (!isNonEmptyString(raw.sex)) throw new Error("Invalid student.sex");
  if (!isNonEmptyString(raw.status)) throw new Error("Invalid student.status");
  if (!isNonEmptyString(raw.parentId)) throw new Error("Invalid student.parentId");
  if (typeof raw.classId !== "number") throw new Error("Invalid student.classId");
  if (typeof raw.gradeId !== "number") throw new Error("Invalid student.gradeId");
  if (!isNonEmptyString(raw.createdAt)) throw new Error("Invalid student.createdAt");

  const email = raw.email === null || raw.email === undefined ? null : String(raw.email);
  const phone = raw.phone === null || raw.phone === undefined ? null : String(raw.phone);
  const address = raw.address === null || raw.address === undefined ? null : String(raw.address);
  const img = raw.img === null || raw.img === undefined ? null : String(raw.img);
  const bloodType = raw.bloodType === null || raw.bloodType === undefined ? null : String(raw.bloodType);

  const admissionYear = raw.admissionYear === null || raw.admissionYear === undefined ? null : Number(raw.admissionYear);
  const admissionLevel = raw.admissionLevel === null || raw.admissionLevel === undefined ? null : Number(raw.admissionLevel);
  const admissionSerial = raw.admissionSerial === null || raw.admissionSerial === undefined ? null : Number(raw.admissionSerial);

  if (!isOptionalString(email)) throw new Error("Invalid student.email");
  if (!isOptionalString(phone)) throw new Error("Invalid student.phone");
  if (!isOptionalString(address)) throw new Error("Invalid student.address");
  if (!isOptionalString(img)) throw new Error("Invalid student.img");
  if (!isOptionalString(bloodType)) throw new Error("Invalid student.bloodType");
  if (!isOptionalNumber(admissionYear)) throw new Error("Invalid student.admissionYear");
  if (!isOptionalNumber(admissionLevel)) throw new Error("Invalid student.admissionLevel");
  if (!isOptionalNumber(admissionSerial)) throw new Error("Invalid student.admissionSerial");

  return {
    id: raw.id,
    username: raw.username,
    name: raw.name,
    surname: raw.surname,
    email,
    phone,
    address,
    img,
    bloodType,
    sex: raw.sex,
    status: raw.status,
    parentId: raw.parentId,
    classId: raw.classId,
    gradeId: raw.gradeId,
    admissionYear,
    admissionLevel,
    admissionSerial,
    createdAt: raw.createdAt,
  };
}

function ensureSchema(db: Database.Database): void {
  const ddl = [
    "CREATE TABLE IF NOT EXISTS school (" +
      "id INTEGER PRIMARY KEY, " +
      "name TEXT NOT NULL, " +
      "code TEXT, " +
      "active INTEGER NOT NULL, " +
      "created_at TEXT NOT NULL, " +
      "updated_at TEXT NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_school_code ON school (code)",
    "CREATE TABLE IF NOT EXISTS grade (" +
      "id INTEGER PRIMARY KEY, " +
      "level INTEGER NOT NULL, " +
      "stage TEXT" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_level ON grade (level)",
    "CREATE TABLE IF NOT EXISTS class (" +
      "id INTEGER PRIMARY KEY, " +
      "name TEXT NOT NULL, " +
      "capacity INTEGER NOT NULL, " +
      "school_id INTEGER, " +
      "grade_id INTEGER NOT NULL, " +
      "pathway TEXT" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_class_school_name ON class (school_id, name)",
    "CREATE TABLE IF NOT EXISTS fee_category (" +
      "id INTEGER PRIMARY KEY, " +
      "name TEXT NOT NULL, " +
      "description TEXT, " +
      "is_recurring INTEGER NOT NULL, " +
      "frequency TEXT NOT NULL, " +
      "is_editable INTEGER NOT NULL, " +
      "active INTEGER NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_category_name ON fee_category (name)",
    "CREATE TABLE IF NOT EXISTS class_fee_structure (" +
      "id INTEGER PRIMARY KEY, " +
      "class_id INTEGER NOT NULL, " +
      "fee_category_id INTEGER NOT NULL, " +
      "term TEXT, " +
      "academic_year INTEGER, " +
      "amount INTEGER NOT NULL, " +
      "active INTEGER NOT NULL, " +
      "created_at TEXT NOT NULL, " +
      "updated_at TEXT NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_class_fee_structure_key ON class_fee_structure (class_id, fee_category_id, term, academic_year)",
    "CREATE TABLE IF NOT EXISTS student_fee (" +
      "id TEXT PRIMARY KEY, " +
      "student_id TEXT NOT NULL, " +
      "fee_category_id INTEGER, " +
      "base_amount INTEGER, " +
      "amount_due INTEGER NOT NULL, " +
      "amount_paid INTEGER NOT NULL, " +
      "due_date TEXT, " +
      "status TEXT NOT NULL, " +
      "term TEXT, " +
      "academic_year INTEGER, " +
      "locked INTEGER NOT NULL, " +
      "created_at TEXT NOT NULL, " +
      "updated_at TEXT NOT NULL" +
      ")",
    "CREATE INDEX IF NOT EXISTS idx_student_fee_student_term ON student_fee (student_id, academic_year, term)",
    "CREATE TABLE IF NOT EXISTS invoice (" +
      "id INTEGER PRIMARY KEY, " +
      "student_id TEXT NOT NULL, " +
      "term TEXT NOT NULL, " +
      "due_date TEXT NOT NULL, " +
      "total_amount INTEGER NOT NULL, " +
      "status TEXT NOT NULL, " +
      "created_at TEXT NOT NULL" +
      ")",
    "CREATE INDEX IF NOT EXISTS idx_invoice_student_term ON invoice (student_id, term)",
    "CREATE TABLE IF NOT EXISTS payment (" +
      "id INTEGER PRIMARY KEY, " +
      "invoice_id INTEGER, " +
      "student_fee_id TEXT, " +
      "amount INTEGER NOT NULL, " +
      "method TEXT NOT NULL, " +
      "reference TEXT, " +
      "paid_at TEXT NOT NULL, " +
      "client_request_id TEXT, " +
      "created_offline INTEGER NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_client_request ON payment (client_request_id)",
    "CREATE TABLE IF NOT EXISTS teacher (" +
      "id TEXT PRIMARY KEY, " +
      "username TEXT NOT NULL, " +
      "name TEXT NOT NULL, " +
      "surname TEXT NOT NULL, " +
      "email TEXT, " +
      "phone TEXT, " +
      "address TEXT NOT NULL, " +
      "img TEXT, " +
      "blood_type TEXT NOT NULL, " +
      "sex TEXT NOT NULL, " +
      "birthday TEXT NOT NULL, " +
      "created_at TEXT NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_username ON teacher (username)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_email ON teacher (email)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_phone ON teacher (phone)",
    "CREATE TABLE IF NOT EXISTS parent (" +
      "id TEXT PRIMARY KEY, " +
      "username TEXT NOT NULL, " +
      "name TEXT NOT NULL, " +
      "surname TEXT NOT NULL, " +
      "email TEXT, " +
      "phone TEXT NOT NULL, " +
      "address TEXT, " +
      "created_at TEXT NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_username ON parent (username)",
    "CREATE TABLE IF NOT EXISTS subject (" +
      "id INTEGER PRIMARY KEY, " +
      "name TEXT NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_name ON subject (name)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_email ON parent (email)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_phone ON parent (phone)",
    "CREATE TABLE IF NOT EXISTS student (" +
      "id TEXT PRIMARY KEY, " +
      "username TEXT NOT NULL, " +
      "name TEXT NOT NULL, " +
      "surname TEXT NOT NULL, " +
      "email TEXT, " +
      "phone TEXT, " +
      "address TEXT, " +
      "img TEXT, " +
      "blood_type TEXT, " +
      "sex TEXT NOT NULL, " +
      "status TEXT NOT NULL, " +
      "parent_id TEXT NOT NULL, " +
      "class_id INTEGER NOT NULL, " +
      "grade_id INTEGER NOT NULL, " +
      "admission_year INTEGER, " +
      "admission_level INTEGER, " +
      "admission_serial INTEGER, " +
      "created_at TEXT NOT NULL" +
      ")",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_username ON student (username)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_email ON student (email)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_phone ON student (phone)",
  ];

  ddl.forEach((sql) => {
    db.exec(sql);
  });
}

function clearNormalizedTables(db: Database.Database): void {
  db.exec("DELETE FROM class_fee_structure");
  db.exec("DELETE FROM payment");
  db.exec("DELETE FROM invoice");
  db.exec("DELETE FROM student_fee");
  db.exec("DELETE FROM fee_category");
  db.exec("DELETE FROM parent");
  db.exec("DELETE FROM subject");
  db.exec("DELETE FROM teacher");
  db.exec("DELETE FROM student");
  db.exec("DELETE FROM grade");
  db.exec("DELETE FROM class");
  db.exec("DELETE FROM school");
}

function loadSnapshotSchools(db: Database.Database): SnapshotSchool[] {
  const stmt = db.prepare("SELECT data FROM snapshot_schools");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotSchool[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const school = toSnapshotSchool(value);
    parsed.push(school);
  });

  return parsed;
}

function loadSnapshotGrades(db: Database.Database): SnapshotGrade[] {
  const stmt = db.prepare("SELECT data FROM snapshot_grades");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotGrade[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const grade = toSnapshotGrade(value);
    parsed.push(grade);
  });

  return parsed;
}

function loadSnapshotClassFeeStructures(db: Database.Database): SnapshotClassFeeStructure[] {
  const stmt = db.prepare("SELECT data FROM snapshot_class_fee_structures");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotClassFeeStructure[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotClassFeeStructure(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotTeachers(db: Database.Database): SnapshotTeacher[] {
  const stmt = db.prepare("SELECT data FROM snapshot_teachers");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotTeacher[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotTeacher(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotParents(db: Database.Database): SnapshotParent[] {
  const stmt = db.prepare("SELECT data FROM snapshot_parents");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotParent[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotParent(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotSubjects(db: Database.Database): SnapshotSubject[] {
  const stmt = db.prepare("SELECT data FROM snapshot_subjects");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotSubject[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotSubject(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotFeeCategories(db: Database.Database): SnapshotFeeCategory[] {
  const stmt = db.prepare("SELECT data FROM snapshot_fee_categories");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotFeeCategory[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotFeeCategory(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotStudentFees(db: Database.Database): SnapshotStudentFee[] {
  const stmt = db.prepare("SELECT data FROM snapshot_student_fees");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotStudentFee[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotStudentFee(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotInvoices(db: Database.Database): SnapshotInvoice[] {
  const stmt = db.prepare("SELECT data FROM snapshot_invoices");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotInvoice[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotInvoice(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotPayments(db: Database.Database): SnapshotPayment[] {
  const stmt = db.prepare("SELECT data FROM snapshot_payments");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotPayment[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotPayment(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotClasses(db: Database.Database): SnapshotClass[] {
  const stmt = db.prepare("SELECT data FROM snapshot_classes");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotClass[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const item = toSnapshotClass(value);
    parsed.push(item);
  });

  return parsed;
}

function loadSnapshotStudents(db: Database.Database): SnapshotStudent[] {
  const stmt = db.prepare("SELECT data FROM snapshot_students");
  const rows = stmt.all() as { data: string }[];

  const parsed: SnapshotStudent[] = [];

  rows.forEach((row) => {
    const value = JSON.parse(row.data) as unknown;
    const student = toSnapshotStudent(value);
    parsed.push(student);
  });

  return parsed;
}

function materializeStudents(db: Database.Database): void {
  const students = loadSnapshotStudents(db);

  const insert = db.prepare<{
    id: string;
    username: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    img: string | null;
    blood_type: string | null;
    sex: string;
    status: string;
    parent_id: string;
    class_id: number;
    grade_id: number;
    admission_year: number | null;
    admission_level: number | null;
    admission_serial: number | null;
    created_at: string;
  }>(
    "INSERT INTO student (" +
      "id, username, name, surname, email, phone, address, img, blood_type, " +
      "sex, status, parent_id, class_id, grade_id, " +
      "admission_year, admission_level, admission_serial, created_at" +
      ") VALUES (" +
      "@id, @username, @name, @surname, @email, @phone, @address, @img, @blood_type, " +
      "@sex, @status, @parent_id, @class_id, @grade_id, " +
      "@admission_year, @admission_level, @admission_serial, @created_at" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotStudent[]) => {
    items.forEach((student) => {
      insert.run({
        id: student.id,
        username: student.username,
        name: student.name,
        surname: student.surname,
        email: student.email,
        phone: student.phone,
        address: student.address,
        img: student.img,
        blood_type: student.bloodType,
        sex: student.sex,
        status: student.status,
        parent_id: student.parentId,
        class_id: student.classId,
        grade_id: student.gradeId,
        admission_year: student.admissionYear,
        admission_level: student.admissionLevel,
        admission_serial: student.admissionSerial,
        created_at: student.createdAt,
      });
    });
  });

  insertMany(students);
}

function materializeSchools(db: Database.Database): void {
  const schools = loadSnapshotSchools(db);

  const insert = db.prepare<{
    id: number;
    name: string;
    code: string | null;
    active: number;
    created_at: string;
    updated_at: string;
  }>(
    "INSERT INTO school (" +
      "id, name, code, active, created_at, updated_at" +
      ") VALUES (" +
      "@id, @name, @code, @active, @created_at, @updated_at" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotSchool[]) => {
    items.forEach((school) => {
      insert.run({
        id: school.id,
        name: school.name,
        code: school.code,
        active: school.active ? 1 : 0,
        created_at: school.createdAt,
        updated_at: school.updatedAt,
      });
    });
  });

  insertMany(schools);
}

function materializeGrades(db: Database.Database): void {
  const grades = loadSnapshotGrades(db);

  const insert = db.prepare<{
    id: number;
    level: number;
    stage: string | null;
  }>(
    "INSERT INTO grade (" +
      "id, level, stage" +
      ") VALUES (" +
      "@id, @level, @stage" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotGrade[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        level: item.level,
        stage: item.stage,
      });
    });
  });

  insertMany(grades);
}

function materializeClasses(db: Database.Database): void {
  const classes = loadSnapshotClasses(db);

  const insert = db.prepare<{
    id: number;
    name: string;
    capacity: number;
    school_id: number | null;
    grade_id: number;
    pathway: string | null;
  }>(
    "INSERT INTO class (" +
      "id, name, capacity, school_id, grade_id, pathway" +
      ") VALUES (" +
      "@id, @name, @capacity, @school_id, @grade_id, @pathway" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotClass[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        name: item.name,
        capacity: item.capacity,
        school_id: item.schoolId,
        grade_id: item.gradeId,
        pathway: item.pathway,
      });
    });
  });

  insertMany(classes);
}

function materializeFeeCategories(db: Database.Database): void {
  const categories = loadSnapshotFeeCategories(db);

  const insert = db.prepare<{
    id: number;
    name: string;
    description: string | null;
    is_recurring: number;
    frequency: string;
    is_editable: number;
    active: number;
  }>(
    "INSERT INTO fee_category (" +
      "id, name, description, is_recurring, frequency, is_editable, active" +
      ") VALUES (" +
      "@id, @name, @description, @is_recurring, @frequency, @is_editable, @active" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotFeeCategory[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        name: item.name,
        description: item.description,
        is_recurring: item.isRecurring ? 1 : 0,
        frequency: item.frequency,
        is_editable: item.isEditable ? 1 : 0,
        active: item.active ? 1 : 0,
      });
    });
  });

  insertMany(categories);
}

function materializeClassFeeStructures(db: Database.Database): void {
  const structures = loadSnapshotClassFeeStructures(db);

  const insert = db.prepare<{
    id: number;
    class_id: number;
    fee_category_id: number;
    term: string | null;
    academic_year: number | null;
    amount: number;
    active: number;
    created_at: string;
    updated_at: string;
  }>(
    "INSERT INTO class_fee_structure (" +
      "id, class_id, fee_category_id, term, academic_year, amount, active, created_at, updated_at" +
      ") VALUES (" +
      "@id, @class_id, @fee_category_id, @term, @academic_year, @amount, @active, @created_at, @updated_at" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotClassFeeStructure[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        class_id: item.classId,
        fee_category_id: item.feeCategoryId,
        term: item.term,
        academic_year: item.academicYear,
        amount: item.amount,
        active: item.active ? 1 : 0,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      });
    });
  });

  insertMany(structures);
}

function materializeStudentFees(db: Database.Database): void {
  const fees = loadSnapshotStudentFees(db);

  const insert = db.prepare<{
    id: string;
    student_id: string;
    fee_category_id: number | null;
    base_amount: number | null;
    amount_due: number;
    amount_paid: number;
    due_date: string | null;
    status: string;
    term: string | null;
    academic_year: number | null;
    locked: number;
    created_at: string;
    updated_at: string;
  }>(
    "INSERT INTO student_fee (" +
      "id, student_id, fee_category_id, base_amount, amount_due, amount_paid, due_date, " +
      "status, term, academic_year, locked, created_at, updated_at" +
      ") VALUES (" +
      "@id, @student_id, @fee_category_id, @base_amount, @amount_due, @amount_paid, @due_date, " +
      "@status, @term, @academic_year, @locked, @created_at, @updated_at" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotStudentFee[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        student_id: item.studentId,
        fee_category_id: item.feeCategoryId,
        base_amount: item.baseAmount,
        amount_due: item.amountDue,
        amount_paid: item.amountPaid,
        due_date: item.dueDate,
        status: item.status,
        term: item.term,
        academic_year: item.academicYear,
        locked: item.locked ? 1 : 0,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      });
    });
  });

  insertMany(fees);
}

function materializeInvoices(db: Database.Database): void {
  const invoices = loadSnapshotInvoices(db);

  const insert = db.prepare<{
    id: number;
    student_id: string;
    term: string;
    due_date: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>(
    "INSERT INTO invoice (" +
      "id, student_id, term, due_date, total_amount, status, created_at" +
      ") VALUES (" +
      "@id, @student_id, @term, @due_date, @total_amount, @status, @created_at" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotInvoice[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        student_id: item.studentId,
        term: item.term,
        due_date: item.dueDate,
        total_amount: item.totalAmount,
        status: item.status,
        created_at: item.createdAt,
      });
    });
  });

  insertMany(invoices);
}

function materializePayments(db: Database.Database): void {
  const payments = loadSnapshotPayments(db);

  const insert = db.prepare<{
    id: number;
    invoice_id: number | null;
    student_fee_id: string | null;
    amount: number;
    method: string;
    reference: string | null;
    paid_at: string;
    client_request_id: string | null;
    created_offline: number;
  }>(
    "INSERT INTO payment (" +
      "id, invoice_id, student_fee_id, amount, method, reference, paid_at, client_request_id, created_offline" +
      ") VALUES (" +
      "@id, @invoice_id, @student_fee_id, @amount, @method, @reference, @paid_at, @client_request_id, @created_offline" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotPayment[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        invoice_id: item.invoiceId,
        student_fee_id: item.studentFeeId,
        amount: item.amount,
        method: item.method,
        reference: item.reference,
        paid_at: item.paidAt,
        client_request_id: item.clientRequestId,
        created_offline: item.createdFromOffline ? 1 : 0,
      });
    });
  });

  insertMany(payments);
}

function materializeTeachers(db: Database.Database): void {
  const teachers = loadSnapshotTeachers(db);

  const insert = db.prepare<{
    id: string;
    username: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
    address: string;
    img: string | null;
    blood_type: string;
    sex: string;
    birthday: string;
    created_at: string;
  }>(
    "INSERT INTO teacher (" +
      "id, username, name, surname, email, phone, address, img, blood_type, sex, birthday, created_at" +
      ") VALUES (" +
      "@id, @username, @name, @surname, @email, @phone, @address, @img, @blood_type, @sex, @birthday, @created_at" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotTeacher[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        username: item.username,
        name: item.name,
        surname: item.surname,
        email: item.email,
        phone: item.phone,
        address: item.address,
        img: item.img,
        blood_type: item.bloodType,
        sex: item.sex,
        birthday: item.birthday,
        created_at: item.createdAt,
      });
    });
  });

  insertMany(teachers);
}

function materializeParents(db: Database.Database): void {
  const parents = loadSnapshotParents(db);

  const insert = db.prepare<{
    id: string;
    username: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string;
    address: string | null;
    created_at: string;
  }>(
    "INSERT INTO parent (" +
      "id, username, name, surname, email, phone, address, created_at" +
      ") VALUES (" +
      "@id, @username, @name, @surname, @email, @phone, @address, @created_at" +
      ")",
  );

  const insertMany = db.transaction((items: readonly SnapshotParent[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        username: item.username,
        name: item.name,
        surname: item.surname,
        email: item.email,
        phone: item.phone,
        address: item.address,
        created_at: item.createdAt,
      });
    });
  });

  insertMany(parents);
}

function materializeSubjects(db: Database.Database): void {
  const subjects = loadSnapshotSubjects(db);

  const insert = db.prepare<{
    id: number;
    name: string;
  }>(
    "INSERT INTO subject (id, name) VALUES (@id, @name)",
  );

  const insertMany = db.transaction((items: readonly SnapshotSubject[]) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        name: item.name,
      });
    });
  });

  insertMany(subjects);
}

async function main(): Promise<void> {
  const db = new Database(SQLITE_PATH);

  try {
    db.pragma("journal_mode = WAL");
    db.exec("BEGIN IMMEDIATE TRANSACTION");

    ensureSchema(db);
    clearNormalizedTables(db);
    materializeSchools(db);
    materializeGrades(db);
    materializeClasses(db);
    materializeStudents(db);
    materializeTeachers(db);
    materializeParents(db);
    materializeSubjects(db);
    materializeFeeCategories(db);
    materializeClassFeeStructures(db);
    materializeStudentFees(db);
    materializeInvoices(db);
    materializePayments(db);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    // eslint-disable-next-line no-console
    console.error("SQLite materialization failed:", error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("SQLite materialization top-level error:", error);
  process.exitCode = 1;
});
