# Printing & Export Implementation Plan

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## 1. Goals & Scope

- [x] Enable teachers, admins, and (indirectly) parents to obtain **clean, printable outputs** for key entities:
  - Assignments / homework handouts
  - Student results / report cards
  - Finance reports (debtors list, aging, clearance, collection summaries, receipts/statements)
- [x] Rely primarily on **browser/OS printing flows** so any **wired or Bluetooth printer** that is installed on the device can be used.
- [ ] Introduce **PDF exports** for high-value documents (reports, receipts) to improve sharing and mobile printing.
- [ ] Consider specialized flows for **office/finance printers** (e.g. thermal receipts) only if needed.

Constraints and assumptions:
- [x] This is a **web-first** experience (Next.js, browser-based); no assumption of native desktop or mobile apps.
- [x] We do **not** talk directly to printers; we generate HTML/CSS/PDF that the browser/OS knows how to print.
- [x] Bluetooth printers are treated as normal printers once paired with the OS; we do not rely on Web Bluetooth.

---

## 2. Phase 1 – Browser-Based Printing (MVP)

Focus: fast, low-risk improvements that make existing pages printable via the browser print dialog (`Ctrl+P` / `Cmd+P` or `window.print()`).

### 2.1 Target Screens (v1)

- [ ] Results / report card views
  - Identify the canonical per-student/per-term results page.
  - Ensure it can be rendered with a print-friendly layout.
- [ ] Assignments
  - Identify assignment detail view used by teachers.
  - Ensure there is a clean, single-assignment view suitable for printing.
- [ ] Finance reports
  - [ ] `/finance/debtors`
  - [ ] `/finance/aging`
  - [ ] `/finance/clearance`
  - [ ] `/finance/collections`
  - [ ] `/finance/reports` summary view

### 2.2 Print Actions (UI)

For each target screen above:

- [ ] Add a **“Print”** button in a consistent location (e.g. top-right actions bar or header area):
  - Teachers: visible on assignment and report card screens.
  - Admin/finance: visible on finance report screens.
- [ ] Wire the button to trigger `window.print()` on the client side.
- [ ] Ensure actions respect permissions / roles already enforced on the page.

### 2.3 Print-Specific Layout & Styles

Introduce a shared print stylesheet (global or per-layout) using `@media print`:

- [ ] Define global print rules:
  - [ ] Hide navigation chrome (sidebars, top nav, floating buttons, filters/search, footers that are not part of the document).
  - [ ] Force neutral, high-contrast text colors and white background for the main content area.
  - [ ] Adjust margins for common paper sizes (A4 by default).
  - [ ] Avoid page-breaking inside table rows or important cards where possible.
- [ ] For **results / report cards**:
  - [ ] Restrict layout to a single-column, printable card per student.
  - [ ] Ensure headers (school name, logo if present, academic year, term, student info) appear at the top with consistent sizing.
  - [ ] Make grading tables compact but readable when printed.
- [ ] For **assignments**:
  - [ ] Optimize single-assignment view for one or two pages max.
  - [ ] Ensure large images or attachments are handled gracefully (either scaled or hidden in print).
- [ ] For **finance reports**:
  - [ ] Make tables fully visible on print (no horizontal scroll); allow wrapping of long names where necessary.
  - [ ] Hide filters and extra navigation, but keep applied filter context visible in a header (e.g. year/term, school, class).

### 2.4 Testing & QA (Phase 1)

- [ ] Desktop browsers
  - [ ] Chrome/Edge on Windows:
    - [ ] Print from the main report pages to a **wired printer**.
    - [ ] Print to a **Bluetooth printer** that is paired via Windows.
  - [ ] Verify print preview shows clean pages without UI chrome.
- [ ] Basic mobile test
  - [ ] Android Chrome: open a target page, use browser menu → Print/Share to PDF.
  - [ ] Confirm layout is still legible even if not fully optimized for narrow screens.
- [ ] Accessibility & UX
  - [ ] Ensure print buttons are clearly labeled but not visually dominant.
  - [ ] Confirm no permission leaks (only users who can see a page can print it).

---

## 3. Phase 2 – PDF Exports for Key Documents

Focus: canonical, shareable PDF outputs for high-value documents, especially useful for parents and offline archiving.

### 3.1 Target Documents (v1)

- [ ] Student reports / report cards (per student, per term/year).
- [ ] Official fee statements or receipts (where supported by the finance model).
- [ ] Select finance summaries (e.g. year-end or term-end summaries from `/finance/reports`).

### 3.2 Implementation Approach (to be finalized)

- [ ] Choose a PDF generation strategy compatible with Next.js:
  - Option A: **Server-side HTML → PDF** using a headless browser (e.g. Puppeteer) or a PDF rendering service.
  - Option B: **Client-side React-based PDF** (e.g. React PDF) where data is fetched and rendered purely on the client.
- [ ] Define a dedicated set of **print/PDF templates**, separate from interactive UIs when needed:
  - [ ] For report cards: standardized header, grading summary, teacher remarks, signature section.
  - [ ] For fee statements: balances, transactions, and metadata (student, term, invoice IDs, etc.).

### 3.3 API & Routing

- [ ] Introduce dedicated endpoints for PDF export where necessary, e.g.:
  - `GET /reports/report-card.pdf?studentId=...&term=...`
  - `GET /finance/statement.pdf?studentId=...&year=...`
- [ ] Ensure endpoints:
  - [ ] Re-use existing authorization (RBAC) rules (e.g. `results.read`, `fees.read`).
  - [ ] Apply the correct **school context** for multi-school deployments.
  - [ ] Return `Content-Disposition: attachment` so the browser prompts download.

### 3.4 UI Integration

- [ ] Add **“Download PDF”** buttons next to/under the existing “Print” button on relevant pages.
- [ ] On mobile, verify that tapping “Download PDF” triggers a flow that allows opening and printing the PDF from a system viewer.

### 3.5 Testing & QA (Phase 2)

- [ ] Validate that generated PDFs:
  - [ ] Match the data shown in the UI (no discrepancies).
  - [ ] Have acceptable file size and render quickly.
  - [ ] Print correctly on common printers.
- [ ] Add automated tests for core export endpoints (authorization, parameter validation, happy path).

---

## 4. Phase 3 – Specialized Printer / POS Scenarios (Optional)

This phase is only needed if we see real-world demand for tightly integrated printing (e.g. thermal receipt printers in the finance office).

### 4.1 Requirements Gathering

- [ ] Confirm whether finance/admin teams need:
  - [ ] Automatic printing of transaction receipts to a specific office printer.
  - [ ] Integration with **thermal/Bluetooth POS printers**.
  - [ ] Support for pre-printed stationery or specific paper sizes.

### 4.2 Architecture Options

- [ ] Prefer solutions that avoid direct Web Bluetooth where possible:
  - [ ] Use network-connected printers and standard OS printing from the browser.
  - [ ] Consider a small **desktop utility** or print agent that runs on finance PCs and listens on localhost for print jobs from the web app.
  - [ ] As a last resort, investigate printer-vendor SDKs or native mobile apps that fetch documents from the backend and print via vendor APIs.

### 4.3 Security & Compliance

- [ ] Ensure any advanced printing integration:
  - [ ] Respects existing authentication and authorization boundaries.
  - [ ] Does not expose sensitive data to unintended printers or users.
  - [ ] Has clear auditability if used for financial documents.

---

## 5. Open Questions & Decisions Needed

- [ ] **Top 3 printing use cases** to prioritize (e.g. report cards vs finance statements vs assignments).
- [ ] **Primary devices** used by each role:
  - Admin/finance (likely desktops/laptops in office).
  - Teachers (mix of desktops and mobile devices?).
  - Parents (mobile-centric; may rely more on PDFs).
- [ ] **Specific printer models** (if any) that we should test against (especially for Phase 3).

This plan should be updated as we finalize use cases, select a PDF strategy, and complete each phase.
