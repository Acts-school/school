import prisma from "./prisma";

export type TermLiteral = "TERM1" | "TERM2" | "TERM3";

export type SchoolSettingsDefaults = {
  academicYear: number;
  term: TermLiteral;
  passingScore: number | null;
};

export const getSchoolSettingsDefaults = async (): Promise<SchoolSettingsDefaults> => {
  const now = new Date();
  const fallbackYear = now.getFullYear();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });

  if (!settings) {
    return {
      academicYear: fallbackYear,
      term: "TERM1",
      passingScore: null,
    };
  }

  const term: TermLiteral =
    settings.currentTerm === "TERM1" ||
    settings.currentTerm === "TERM2" ||
    settings.currentTerm === "TERM3"
      ? settings.currentTerm
      : "TERM1";

  return {
    academicYear: settings.currentAcademicYear,
    term,
    passingScore:
      typeof settings.passingScore === "number" && !Number.isNaN(settings.passingScore)
        ? settings.passingScore
        : null,
  };
};
