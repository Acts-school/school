// Mock data for development when database is not available
export const mockTeachers = [
  {
    id: "teacher1",
    username: "john_doe",
    name: "John",
    surname: "Doe",
    email: "john.doe@school.com",
    phone: "123-456-7890",
    address: "123 Main St",
    img: "/noAvatar.png",
    subjects: [{ name: "Math" }, { name: "Physics" }],
    classes: [{ name: "10A" }, { name: "11B" }],
    _count: {
      subjects: 2,
      lessons: 15,
      classes: 2
    }
  },
  {
    id: "teacher2", 
    username: "jane_smith",
    name: "Jane",
    surname: "Smith",
    email: "jane.smith@school.com",
    phone: "098-765-4321",
    address: "456 Oak Ave",
    img: "/noAvatar.png",
    subjects: [{ name: "English" }, { name: "Literature" }],
    classes: [{ name: "9A" }, { name: "10C" }],
    _count: {
      subjects: 2,
      lessons: 12,
      classes: 2
    }
  },
  {
    id: "teacher3",
    username: "bob_wilson",
    name: "Bob", 
    surname: "Wilson",
    email: "bob.wilson@school.com",
    phone: "555-123-4567",
    address: "789 Pine St",
    img: "/noAvatar.png",
    subjects: [{ name: "Chemistry" }],
    classes: [{ name: "11A" }],
    _count: {
      subjects: 1,
      lessons: 8,
      classes: 1
    }
  }
];

export const mockStudents = [
  {
    id: "student1",
    username: "alice_johnson",
    name: "Alice",
    surname: "Johnson",
    email: "alice.johnson@student.com",
    phone: "111-222-3333",
    address: "321 Elm St",
    img: "/noAvatar.png",
    bloodType: "A+",
    sex: "FEMALE",
    birthday: new Date("2005-03-15"),
    parentId: "parent1",
    parent: { name: "Mary", surname: "Johnson" },
    classId: "class1",
    class: { name: "10A" },
    gradeId: "grade1",
    grade: { level: 10 },
    _count: {
      attendances: 145,
      results: 25
    }
  },
  {
    id: "student2",
    username: "mike_brown",
    name: "Mike",
    surname: "Brown", 
    email: "mike.brown@student.com",
    phone: "444-555-6666",
    address: "654 Maple Ave",
    img: "/noAvatar.png",
    bloodType: "B+",
    sex: "MALE",
    birthday: new Date("2006-07-22"),
    parentId: "parent2",
    parent: { name: "Tom", surname: "Brown" },
    classId: "class2",
    class: { name: "9B" },
    gradeId: "grade2", 
    grade: { level: 9 },
    _count: {
      attendances: 138,
      results: 22
    }
  }
];

export const mockClasses = [
  {
    id: "class1",
    name: "10A", 
    capacity: 30,
    supervisorId: "teacher1",
    supervisor: { name: "John", surname: "Doe" },
    gradeId: "grade1",
    grade: { level: 10 },
    _count: {
      students: 25,
      lessons: 35
    }
  },
  {
    id: "class2",
    name: "9B",
    capacity: 28,
    supervisorId: "teacher2", 
    supervisor: { name: "Jane", surname: "Smith" },
    gradeId: "grade2",
    grade: { level: 9 },
    _count: {
      students: 23,
      lessons: 32
    }
  }
];

export const mockSubjects = [
  {
    id: "subject1",
    name: "Mathematics",
    teachers: [{ name: "John", surname: "Doe" }],
    _count: {
      teachers: 1,
      lessons: 150
    }
  },
  {
    id: "subject2", 
    name: "English",
    teachers: [{ name: "Jane", surname: "Smith" }],
    _count: {
      teachers: 1,
      lessons: 120
    }
  },
  {
    id: "subject3",
    name: "Physics", 
    teachers: [{ name: "John", surname: "Doe" }],
    _count: {
      teachers: 1,
      lessons: 80
    }
  }
];

export const mockFormData = {
  teachers: {
    subjects: [
      { id: "subject1", name: "Mathematics" },
      { id: "subject2", name: "English" },
      { id: "subject3", name: "Physics" },
      { id: "subject4", name: "Chemistry" }
    ]
  },
  students: {
    grades: [
      { id: "grade1", level: 9 },
      { id: "grade2", level: 10 },
      { id: "grade3", level: 11 }
    ],
    classes: [
      { id: "class1", name: "9A" },
      { id: "class2", name: "9B" },
      { id: "class3", name: "10A" },
      { id: "class4", name: "10B" }
    ],
    parents: [
      { id: "parent1", name: "Mary Johnson" },
      { id: "parent2", name: "Tom Brown" },
      { id: "parent3", name: "Lisa Wilson" }
    ]
  },
  classes: {
    grades: [
      { id: "grade1", level: 9 },
      { id: "grade2", level: 10 },
      { id: "grade3", level: 11 }
    ],
    teachers: [
      { id: "teacher1", name: "John Doe" },
      { id: "teacher2", name: "Jane Smith" },
      { id: "teacher3", name: "Bob Wilson" }
    ]
  },
  subjects: {
    teachers: [
      { id: "teacher1", name: "John Doe" },
      { id: "teacher2", name: "Jane Smith" },
      { id: "teacher3", name: "Bob Wilson" }
    ]
  }
};