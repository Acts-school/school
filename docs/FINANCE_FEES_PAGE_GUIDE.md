# Finance – Fees Page Guide

This guide explains how to use the **Finance → Fee Structure** page in the admin dashboard.

It covers:

- **Who** should use the page and required permissions
- **How to navigate** to the page
- **What each section does** (summary card, forms, editors, and tables)
- **Step‑by‑step workflows** for configuring and maintaining fee structures

---

## 1. Audience and Permissions

- **Intended users**: School **admins** and **accountants** responsible for setting up and monitoring school fees.
- **Permissions required**:
  - Viewing the page requires `fees.read`.
  - Changing fee structures and categories generally requires `fees.write`.

If you do not see the page or some actions are disabled, your account may not have the required permissions.

---

## 2. Navigating to the Fees Page

1. Sign in with an **admin** or **accountant** account.
2. From the main navigation, go to:
   - **Dashboard → Finance → Fee Structure**
3. You should see:
   - A breadcrumb like: `Dashboard / Finance / Fee Structure (All schools or School #X)`
   - A small summary card with **Budget vs actual – fee income**
   - Sections for:
     - **Fee Structure form**
     - **Class Fee Structure Editor**
     - **Fee Categories**
     - A **table of defined fee structures**

---

## 3. Page Layout Overview

### 3.1 Top Summary Card – Budget vs Actual Fee Income

At the top of the page there is a compact card that shows:

- **Budget vs actual – fee income (year, term)**
- **Budgeted income (approved budget)**
  - Total income planned for the current academic year from the approved budget.
- **Actual fee income received**
  - Sum of all **student fee payments** recorded so far in the current year/term.
- **Variance (actual − budget)**
  - Positive = fees collected exceed budget.
  - Negative = collected less than budget.
- **Fees due (for context)**
  - Total fees **assigned to students** (amount due) for the current academic year/term.

This section is **read‑only** and is meant to give you a quick financial snapshot before you adjust anything.

### 3.2 Fee Structure Form (Global Fee Items)

Below the summary card, you will see a **Fee Structure form**.

This form is used to define **named fee items** that can be associated with students and used throughout the system. Each entry corresponds to a row in the `FeeStructure` table.

Typical examples:

- "Nursery term tuition"
- "Primary meals"
- "Interview fee"

The form usually includes:

- **Name / Title** – What the fee is called (e.g. *Tuition*, *Meals*, *Interview*)
- **Amount (KES)** – The amount per student, entered in Kenyan Shillings
- **Optional grade/class selection** – To tie a fee to a particular grade or class

**When to use this form**

- When you want to register a **reusable fee definition** (e.g. a base tuition fee) that can be linked to multiple students or used in other tools.
- When you need a simple global list of fee items to appear on other finance screens.

This form does **not** directly generate individual student fee rows; instead it defines the building blocks that can be used elsewhere.

### 3.3 Class Fee Structure Editor

The **Class Fee Structure Editor** is the main tool for configuring **term‑by‑term fee amounts per class and category**.

It is backed by the `ClassFeeStructure` model and fee **categories**. This is the part of the page you will use most when setting up or adjusting fees for a new academic year.

#### 3.3.1 Key Concepts

- **Class** – A specific class (e.g. "Grade 1 East", "PP1").
- **Academic Year** – The year the fees apply to (e.g. 2025).
- **Fee Categories** – Logical buckets like *Tuition*, *Meals*, *Transport*, *School Exam*, etc., defined in the **Fee Categories** section.
- **Term columns** – Separate KES amounts for **TERM1**, **TERM2**, **TERM3**.
- **YEARLY column** – For fees that are paid **once per year** and displayed under Term 1 for reporting.

Each cell in the grid is a **KES amount** for:

> (Class, Academic Year, Fee Category, Term or YEARLY)

#### 3.3.2 Selector Bar (Filters and Scope)

At the top of the editor you will see controls for:

- **Class** – Select the target class you are configuring.
- **Academic Year** – Set the year you are configuring.
- **Scope** – `All` vs `Term only` for preview/apply operations.
- **Term (when Scope = term)** – Which term the preview/apply should affect.
- Action buttons:
  - **Save**
  - **Preview**
  - **Apply**

You must select a **Class** and **Academic Year** before saving or applying.

#### 3.3.3 Editing Term Amounts

In the main table:

- Rows = **fee categories**.
- Columns = **TERM1**, **TERM2**, **TERM3**.
- Each cell:
  - Shows the current KES value for that category and term.
  - Can be edited directly as a number (e.g. `4500` for KES 4,500).
  - Has a **Save** button next to it for saving that **single line**.

There are two ways to persist your changes:

1. **Inline save (per cell)**
   - Edit a cell → click **Save** next to that cell.
   - The change for that one category/term is sent to the server immediately.
2. **Bulk save (all lines)**
   - Make multiple edits across the grid.
   - Click the main **Save** button at the top of the editor.
   - All configured lines for the current class/year are sent in one batch.

After a successful save, the editor will reload the current values from the server.

#### 3.3.4 Yearly / One‑time Section

Below the main grid, there is a **Yearly / One‑time** section:

- This section has one **YEARLY (KES)** column.
- Each row is again a fee category.
- Use this to set amounts that are **charged once per year** (e.g. admission fee, interview fee, uniform if handled as a once‑off, etc.).
- In the system, yearly lines are **applied once** and **shown under Term 1** for display.

You can edit and save YEARLY amounts the same way as term amounts, with **inline Save buttons**.

#### 3.3.5 Expected Totals and Auto‑balance (Primary Grades)

For primary grades (1–6), the editor includes:

- A **Totals** row: shows the sum of all category amounts per term (KES).
- An **Expected (KES)** row: hard‑coded targets for each term (e.g. the school’s official fee schedule).
- A **Diff (Totals − Expected)** row: how far your configured totals are from the expected amounts.
- An **“Auto‑balance with Term Adjustment”** button (when an appropriate category exists).

How **Auto‑balance** works:

- It looks for a category named **"Term Adjustment"**.
- For each term (TERM1/TERM2/TERM3) it:
  - Computes the difference between the **expected** total and the **current total excluding the Term Adjustment category**.
  - Sets the **Term Adjustment** amount for that term so that `Totals ≈ Expected`.

When to use Auto‑balance:

- You have entered detailed amounts for all standard categories.
- You want the overall term total to match a fixed official figure.
- You are comfortable using a dedicated **Term Adjustment** category to hold the balancing difference.

After auto‑balancing, remember to **Save** the changes.

#### 3.3.6 Preview and Apply (Student Fee Rows)

The Class Fee Structure Editor can not only store class‑level amounts; it can also **preview and apply** changes to individual student fee rows.

- **Preview**
  - Click **Preview** after choosing class, year, and (optionally) scope/term.
  - The system calculates how many **student fee rows** would be affected by the current structure.
  - It shows a message like: *“Preview will affect X student fee rows.”*
  - No data is changed at this stage; this is safe to run.

- **Apply**
  - After confirming the preview, click **Apply**.
  - The system writes changes to **StudentFee** records for the chosen class/year (and term, if scope = term).
  - This is how you **roll out fee changes to actual students**.

Best practice:

1. Configure or adjust the grid.
2. Click **Save**.
3. Click **Preview** and confirm that the affected row count makes sense.
4. Only then click **Apply** to update student fees.

#### 3.3.7 Audit Log (Recent Changes)

Above the grid there is an **audit section** that shows recent changes made to class fee structures.

- It lists changes with a summary, including:
  - Category id, term, amount (in KES), active flag.
  - Timestamp.
- For each log entry you can:
  - **Revert** – restore the previous value for that single line into the grid.
  - **Revert all** – restore all lines that were changed at that same timestamp.

Important:

- Revert interacts with the **editor grid** only.
- After reverting, you still need to **Save** to persist the restored values.

### 3.4 Fee Categories

The **Fee Categories** section manages the master list of fee categories used by the Class Fee Structure Editor.

You can:

- **Create new categories**
  - Fill in:
    - **Name** (e.g. *Tuition*, *Meals*, *School Exam*, *Transport*).
    - **Optional description** – for internal notes.
    - **Frequency** – one of:
      - `TERMLY` – charged every term.
      - `YEARLY` – charged once per year.
      - `ONE_TIME` – a one‑off fee (e.g. admission, interview).
  - Click **Add Category**.

- **Edit category names**
  - Modify the name in the table input.
  - Click **Save** on that row.

- **Activate / deactivate categories**
  - Use the checkbox in the **Active** column.
  - Inactive categories remain in history but can be hidden from future use.

These categories are referenced by the Class Fee Structure Editor and appear as rows in the fee grid.

### 3.5 Fee Structure Table (Global List)

At the bottom of the page, you will see a **table of fee structures**.

Columns include:

- **Name** – Fee item name.
- **Grade** – Associated grade level (or `-` if not set).
- **Amount** – Amount in KES (formatted from internal minor units).
- **Active** – Whether the structure is active.

This table is **read‑only** on this page and serves as an overview of all defined `FeeStructure` items.

---

## 4. Typical Workflows

### 4.1 At the Start of an Academic Year

1. **Confirm school settings**
   - Ensure the current academic year and term are set correctly in the School Settings.

2. **Review or set up fee categories**
   - Go to the **Fee Categories** section.
   - Ensure that standard categories (e.g. *Tuition*, *Meals*, *School Exam*, *Transport*, *Term Adjustment*) exist.
   - Add missing categories with appropriate frequencies (`TERMLY`, `YEARLY`, `ONE_TIME`).

3. **Configure class fee structures**
   - In the **Class Fee Structure Editor**:
     - Select a **Class**.
     - Set the **Academic Year**.
     - Enter KES amounts for each **category** and **term**.
     - Use the **Yearly / One‑time** section for once‑per‑year fees.
     - If applicable, use **Auto‑balance with Term Adjustment** to match official totals.
   - Click **Save** to persist the structure.

4. **Preview and apply to students**
   - Click **Preview** to see how many student fee rows will be affected.
   - If the count looks reasonable, click **Apply**.
   - Repeat for each class as needed.

### 4.2 Adjusting Fees Mid‑Term

Use the Class Fee Structure Editor when you need to **update the fee schedule for many students at once**:

1. Select the **Class** and **Academic Year**.
2. Change the relevant category/term cells.
3. **Save** your changes.
4. **Preview** the impact.
5. **Apply** to update student fee rows.
6. Check the **audit log** to confirm that the changes were recorded correctly.

For **individual** adjustments (e.g. hardship cases, sibling discounts), you typically use dedicated student‑fee views elsewhere in the system (such as per‑student finance pages or inline student fee cards) that leverage the `adjustStudentFee` action.

### 4.3 Monitoring Performance vs Budget

On the same page, you can monitor how actual fee collections compare to budget:

1. Look at the **Budget vs actual – fee income** card at the top.
2. Note:
   - **Budgeted income** – from the approved budget for the year.
   - **Actual fee income received** – from payments recorded against student fees.
   - **Variance (actual − budget)** – surplus or shortfall.
   - **Fees due** – how much is currently assigned to students.
3. If variance is significantly negative, you can:
   - Check whether all class fee structures have been **applied** to students.
   - Investigate collections on other finance pages (collections, aging, clearance, etc.).

---

## 5. Tips and Best Practices

- **Always think in KES, but the system stores minor units**
  - Forms on this page accept and display values in KES.
  - Internally, amounts are converted to **cents** (minor units) for accuracy.

- **Use categories consistently**
  - Decide on a standard set of categories (Tuition, Meals, Exams, Transport, Term Adjustment, etc.).
  - Reuse them consistently instead of creating many similar categories.

- **Auto‑balance is optional**
  - Only use **Auto‑balance with Term Adjustment** if you understand that it adjusts a special Term Adjustment category to make totals match an official set of figures.

- **Preview before Apply**
  - Treat **Apply** as a bulk update tool for student fees.
  - Always **Preview** and review the affected row count before applying.

- **Use the audit log when experimenting**
  - If you make a mistake, you can revert recent changes into the grid, then save again.

- **Roles and access**
  - Reserve structural changes (categories, class fee structures) for users who understand the fee policy and budget.

If you need to adjust or extend this guide for your specific school policies (e.g. naming conventions, grade breakdowns, or discounts), you can edit this markdown file directly in the `docs` folder.
