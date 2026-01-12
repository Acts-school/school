import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import MenuClient from "./MenuClient";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/exam.png",
        label: "Exams",
        href: "/list/exams",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/assignment.png",
        label: "Assignments",
        href: "/list/assignments",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/result.png",
        label: "CBC Competencies",
        href: "/teacher/competencies",
        visible: ["teacher"],
      },
      {
        icon: "/result.png",
        label: "CBC SLOs",
        href: "/teacher/slo",
        visible: ["teacher"],
      },
      {
        icon: "/result.png",
        label: "CBC Analytics",
        href: "/admin/cbc-analytics",
        visible: ["admin"],
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/message.png",
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/finance.png",
        label: "Fees",
        href: "/finance/fees",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/finance.png",
        label: "M-Pesa Review",
        href: "/finance/mpesa-review",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/finance.png",
        label: "Budgets",
        href: "/finance/budget",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/finance.png",
        label: "Admin Reports",
        href: "/finance/reports",
        visible: ["admin"],
      },
      {
        icon: "/finance.png",
        label: "My Fees",
        href: "/student/fees",
        visible: ["student"],
      },
      {
        icon: "/finance.png",
        label: "Children's Fees",
        href: "/parent/fees",
        visible: ["parent"],
      },
      {
        icon: "/finance.png",
        label: "Students' Fees",
        href: "/teacher/fees",
        visible: ["teacher"],
      },
      {
        icon: "/result.png",
        label: "Invoices",
        href: "/finance/invoices",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/result.png",
        label: "Debtors",
        href: "/finance/debtors",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/finance.png",
        label: "Clearance",
        href: "/finance/clearance",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/finance.png",
        label: "Collections",
        href: "/finance/collections",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/result.png",
        label: "Aging",
        href: "/finance/aging",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/calendar.png",
        label: "Expenses",
        href: "/finance/expenses",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/finance.png",
        label: "Payroll",
        href: "/finance/payroll",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/profile.png",
        label: "Staff",
        href: "/finance/staff",
        visible: ["admin", "accountant"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/settings",
        visible: ["admin", "accountant", "teacher", "student", "parent"],
      },
      {
        icon: "/singleBranch.png",
        label: "Schools",
        href: "/schools",
        visible: ["admin"],
      },
      {
        icon: "/logout.png",
        label: "Logout",
        href: "/logout",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
];

const Menu = async () => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? null;

  return <MenuClient sections={menuItems} role={role} />;
};

export default Menu;
