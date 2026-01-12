import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { CbcTermReport, CbcLearningAreaReport, CbcCompetencyReportRow } from "@/lib/cbcReports";
import type { TermAttendanceSummary } from "@/lib/cbcReports";
import type { CbcCompetencyLevel, SloAchievementLevel } from "@prisma/client";

export type CbcTermReportDocumentProps = {
  report: CbcTermReport;
  attendance: TermAttendanceSummary;
  schoolName: string;
  systemName: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 57, // ~20mm
    paddingBottom: 57, // ~20mm
    paddingHorizontal: 43, // ~15mm
    fontSize: 9.5,
    lineHeight: 1.4,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingBottom: 8,
  },
  headerSchoolName: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerSchoolSub: {
    fontSize: 9,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
  },
  learnerStrip: {
    marginBottom: 10,
    padding: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
  },
  learnerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  learnerCol: {
    width: "48%",
  },
  learnerLabel: {
    fontSize: 9,
    fontWeight: "bold",
  },
  learnerValue: {
    fontSize: 9,
  },
  section: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#1F2937",
    marginBottom: 2,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    marginBottom: 4,
  },
  table: {
    borderWidth: 0.5,
    borderColor: "#D1D5DB",
    borderRadius: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 0.5,
    borderBottomColor: "#D1D5DB",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    minHeight: 20,
    alignItems: "center",
  },
  cell: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 9,
  },
  cellLearningArea: {
    width: "30%",
  },
  cellRating: {
    width: "6%",
    textAlign: "center",
  },
  cellComment: {
    width: "52%",
  },
  cellCompetencyName: {
    width: "70%",
  },
  cellValuesLabel: {
    width: "60%",
  },
  cellValuesCol: {
    width: "20%",
    textAlign: "center",
  },
  checkbox: {
    fontSize: 9,
    textAlign: "center",
  },
  textSmall: {
    fontSize: 8.5,
  },
  commentBox: {
    borderWidth: 0.5,
    borderColor: "#D1D5DB",
    padding: 4,
    minHeight: 36,
  },
  attendanceRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#D1D5DB",
  },
  attendanceCellLabel: {
    flex: 1,
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: "#D1D5DB",
    fontSize: 8.5,
  },
  attendanceCellValue: {
    width: 40,
    padding: 4,
    textAlign: "right",
    fontSize: 8.5,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  signatureCol: {
    width: "32%",
  },
  signatureBox: {
    borderWidth: 0.5,
    borderColor: "#D1D5DB",
    padding: 4,
    minHeight: 40,
  },
  footer: {
    position: "absolute",
    left: 43,
    right: 43,
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#6B7280",
  },
  footerCenter: {
    textAlign: "center",
    flex: 1,
  },
  footerSide: {
    width: "30%",
  },
});

const mapSloLevelToShort = (level: SloAchievementLevel): "E" | "AE" | "ME" => {
  if (level === "BELOW_EXPECTATIONS") {
    return "E";
  }
  if (level === "APPROACHING_EXPECTATIONS") {
    return "AE";
  }
  return "ME";
};

const computeLearningAreaRating = (area: CbcLearningAreaReport): "E" | "AE" | "ME" | "EE" | null => {
  if (area.slos.length === 0) {
    return null;
  }

  let hasBelow = false;
  let hasApproaching = false;

  for (const row of area.slos) {
    if (row.level === "BELOW_EXPECTATIONS") {
      hasBelow = true;
      break;
    }
    if (row.level === "APPROACHING_EXPECTATIONS") {
      hasApproaching = true;
    }
  }

  if (hasBelow) {
    return "E";
  }
  if (hasApproaching) {
    return "AE";
  }
  return "ME";
};

const mapCompetencyLevelToShort = (level: CbcCompetencyLevel): "E" | "AE" | "ME" | "EE" => {
  if (level === "EMERGING") {
    return "E";
  }
  if (level === "DEVELOPING") {
    return "AE";
  }
  if (level === "PROFICIENT") {
    return "ME";
  }
  return "EE";
};

const mapCompetencyName = (row: CbcCompetencyReportRow): string => {
  switch (row.competency) {
    case "COMMUNICATION_COLLABORATION":
      return "Communication & Collaboration";
    case "CRITICAL_THINKING_PROBLEM_SOLVING":
      return "Critical Thinking & Problem Solving";
    case "IMAGINATION_CREATIVITY":
      return "Creativity & Imagination";
    case "CITIZENSHIP":
      return "Citizenship";
    case "DIGITAL_LITERACY":
      return "Digital Literacy";
    case "LEARNING_TO_LEARN":
      return "Learning to Learn";
    case "SELF_EFFICACY":
      return "Self-Efficacy";
    default:
      return String(row.competency);
  }
};

const renderCheckboxRow = (selected: "E" | "AE" | "ME" | "EE" | null): ReactElement => {
  const boxes: Array<"E" | "AE" | "ME" | "EE"> = ["E", "AE", "ME", "EE"];

  return (
    <>
      {boxes.map((code) => (
        <Text key={code} style={[styles.cell, styles.cellRating, styles.checkbox]}>
          {selected === code ? "■" : "☐"}
        </Text>
      ))}
    </>
  );
};

export const CbcTermReportDocument = ({
  report,
  attendance,
  schoolName,
  systemName,
}: CbcTermReportDocumentProps): ReactElement => {
  const context = report.context;
  const learningAreas = report.learningAreas;
  const competencies = report.competencies;

  const learnerName = context.studentName;
  const gradeClass = `Grade ${context.gradeLevel} · ${context.className}`;
  const termYear = `${context.term} ${context.academicYear}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerSchoolName}>{schoolName}</Text>
          <Text style={styles.headerSchoolSub}>CBC School Based Assessment</Text>
          <Text style={styles.headerTitle}>CBC END-OF-TERM LEARNER PROGRESS REPORT</Text>
        </View>

        {/* Learner identification strip */}
        <View style={styles.learnerStrip}>
          <View style={styles.learnerRow}>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Learner Name</Text>
              <Text style={styles.learnerValue}>{learnerName}</Text>
            </View>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Admission No / UPI</Text>
              <Text style={styles.learnerValue}>-</Text>
            </View>
          </View>
          <View style={styles.learnerRow}>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Grade / Class</Text>
              <Text style={styles.learnerValue}>{gradeClass}</Text>
            </View>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Term &amp; Year</Text>
              <Text style={styles.learnerValue}>{termYear}</Text>
            </View>
          </View>
          <View style={styles.learnerRow}>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Age</Text>
              <Text style={styles.learnerValue}>-</Text>
            </View>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Gender</Text>
              <Text style={styles.learnerValue}>-</Text>
            </View>
          </View>
          <View style={styles.learnerRow}>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Class Teacher</Text>
              <Text style={styles.learnerValue}>-</Text>
            </View>
            <View style={styles.learnerCol}>
              <Text style={styles.learnerLabel}>Stage</Text>
              <Text style={styles.learnerValue}>{context.stage ?? "-"}</Text>
            </View>
          </View>
        </View>

        {/* Learning Areas table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Areas</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cell, styles.cellLearningArea]}>Learning Area</Text>
              <Text style={[styles.cell, styles.cellRating]}>E</Text>
              <Text style={[styles.cell, styles.cellRating]}>AE</Text>
              <Text style={[styles.cell, styles.cellRating]}>ME</Text>
              <Text style={[styles.cell, styles.cellRating]}>EE</Text>
              <Text style={[styles.cell, styles.cellComment]}>Teacher Comment</Text>
            </View>

            {learningAreas.map((area) => {
              const rating = computeLearningAreaRating(area);

              return (
                <View key={area.learningAreaName} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.cellLearningArea]}>{area.learningAreaName}</Text>
                  {renderCheckboxRow(rating)}
                  <Text style={[styles.cell, styles.cellComment]} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Core competencies table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Competencies</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cell, styles.cellCompetencyName]}>Competency</Text>
              <Text style={[styles.cell, styles.cellRating]}>E</Text>
              <Text style={[styles.cell, styles.cellRating]}>AE</Text>
              <Text style={[styles.cell, styles.cellRating]}>ME</Text>
              <Text style={[styles.cell, styles.cellRating]}>EE</Text>
            </View>

            {competencies.map((row) => {
              const rating = mapCompetencyLevelToShort(row.level);

              return (
                <View key={row.competency} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.cellCompetencyName]}>{mapCompetencyName(row)}</Text>
                  {renderCheckboxRow(rating)}
                </View>
              );
            })}
          </View>
        </View>

        {/* Values section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Values</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cell, styles.cellValuesLabel]}>Value</Text>
              <Text style={[styles.cell, styles.cellValuesCol]}>Consistently</Text>
              <Text style={[styles.cell, styles.cellValuesCol]}>Developing</Text>
            </View>

            {[
              "Responsibility",
              "Respect",
              "Integrity",
              "Love",
              "Unity / Peace",
            ].map((value) => (
              <View key={value} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellValuesLabel]}>{value}</Text>
                <Text style={[styles.cell, styles.cellValuesCol, styles.checkbox]}>☐</Text>
                <Text style={[styles.cell, styles.cellValuesCol, styles.checkbox]}>☐</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Narrative comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teacher&apos;s Overall Comment</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.commentBox}>
            {report.teacherComment ? <Text>{report.teacherComment}</Text> : <Text />}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Head Teacher&apos;s Comment</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.commentBox}>
            <Text />
          </View>
        </View>

        {/* Attendance summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Summary</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceCellLabel}>Days Open</Text>
            <Text style={styles.attendanceCellValue}>{attendance.daysOpen}</Text>
            <Text style={styles.attendanceCellLabel}>Days Present</Text>
            <Text style={styles.attendanceCellValue}>{attendance.daysPresent}</Text>
            <Text style={styles.attendanceCellLabel}>Days Absent</Text>
            <Text style={styles.attendanceCellValue}>{attendance.daysAbsent}</Text>
          </View>
        </View>

        {/* Junior Secondary pathway readiness (stage-specific) */}
        {context.stage === "JUNIOR_SECONDARY" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pathway Readiness (Guidance Only)</Text>
            <View style={styles.sectionDivider} />

            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.cell, styles.cellValuesLabel]}>Area</Text>
                <Text style={[styles.cell, styles.cellComment]}>Observation</Text>
              </View>

              {[
                "STEM Inclination",
                "Creative / Expressive",
                "Technical / Vocational",
              ].map((label) => (
                <View key={label} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.cellValuesLabel]}>{label}</Text>
                  <Text style={[styles.cell, styles.cellComment]} />
                </View>
              ))}
            </View>

            <Text style={styles.textSmall}>
              This section is developmental guidance and not learner placement.
            </Text>
          </View>
        ) : null}

        {/* Signature block */}
        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>Class Teacher</Text>
            <View style={styles.signatureBox}>
              <Text>Name: ________________________</Text>
              <Text>Signature: ____________________</Text>
              <Text>Date: ________________________</Text>
            </View>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>Head Teacher</Text>
            <View style={styles.signatureBox}>
              <Text>Name: ________________________</Text>
              <Text>Signature: ____________________</Text>
              <Text>Date: ________________________</Text>
            </View>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>School Stamp</Text>
            <View style={styles.signatureBox}>
              <Text>Stamp</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerSide}>Generated by {systemName}</Text>
          <Text style={styles.footerCenter}>CBC – School Based Assessment</Text>
          <Text
            style={styles.footerSide}
            render={({ pageNumber, totalPages }): string => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};
