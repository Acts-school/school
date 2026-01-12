# M-Pesa C2B Account Pattern & Legacy PayBill Plan

## Goal
Single source of truth for how C2B PayBill/Till payments are mapped into `Student`, `StudentFee`, `Payment`, and `MpesaTransaction`, with emphasis on legacy shared PayBill `529914`.

## Scope (v1)
- Legacy **shared PayBill** `529914` where the main generic **AccountNumber/BillRef** is `51029`.
  - `BusinessShortCode = 529914` and `BillRefNumber = 51029` → treat as shared/general school fees account using phone-number-first matching and oldest-fee allocation.
  - Optionally, the same PayBill (or future dedicated ones) may use structured AccountNumbers like `ADM123-TUI` to directly target a student + fee component.
- Dedicated **Computer Studies PayBill** `400200` where the **AccountNumber/BillRef** is `01109613617800`.
  - `BusinessShortCode = 400200` and `BillRefNumber = 01109613617800` → treat as Computer Studies-only wallet:
    - phone-number-first matching (parent/student/alias) to pick a single student;
    - auto-allocate to that student’s oldest outstanding `Computer Studies` `StudentFee` rows only;
    - if no matching student or no Computer Studies fees, queue as `PENDING` with appropriate `reviewReason`.
  - Any other BillRef under `400200` is recorded as `PENDING` with `reviewReason = OTHER`.
- Shared **M-Pesa till** `5669463` for general school fees (excluding Computer Studies).
  - `BusinessShortCode = 5669463` (M-Pesa Till) with no structured AccountNumber pattern:
    - phone-number-first matching (parent/student/alias) to pick a single student;
    - auto-allocate to that student’s oldest outstanding non–`Computer Studies` `StudentFee` rows only;
    - Computer Studies remains payable via its dedicated PayBill `400200` and is not captured by this till.
  - If no matching student or no non–Computer Studies fees, queue as `PENDING` with appropriate `reviewReason`.
- Applies to C2B `confirm` endpoint only; STK push flow unchanged.

## Key rules (summary)
1. Phone number first binding for `529914`.
2. Auto-allocate to oldest outstanding fees for matched student.
3. Use account pattern `ADM123-TUI` when provided to disambiguate or override.
4. Record all C2B events as `MpesaTransaction`; never drop data.
5. Push only clearly-resolved cases into `Payment`/`StudentFee`; queue rest for admin.

## Implementation Checklist

### 1. Data & schema (status)
- [x] `MpesaTransaction` model and enums in Prisma
- [x] `MPESA` payment method
- [ ] Add optional `payerPhone` + `payerName` fields to `MpesaTransaction` if needed
- [x] (Optional) Table/model for student phone bindings / aliases

### 2. C2B `confirm` handler logic
- [x] Normalize MSISDN to canonical format (e.g. `2547...`)
- [x] Detect legacy PayBill `529914`
- [x] Phone-number-first student lookup (current + historical phone fields)
- [x] Fallback to `ADM123-TUI` parsing when AccountNumber present
- [x] Locate current-term `StudentFee` for target `FeeCategory`
- [x] Apply payment via `applyStudentFeePayment` using `MPESA`
- [x] Persist `MpesaTransaction` with links: `student`, `payment`, `studentFee`
- [x] Idempotency by receipt number (already partially implemented; confirm behavior)
- [x] Mark unresolved / ambiguous matches as `PENDING_REVIEW`

### 3. Unmatched / ambiguous handling
- [x] Define categories: `NO_STUDENT`, `MULTIPLE_STUDENTS`, `NO_FEES`, `OVERPAYMENT`
- [x] Persist reason on `MpesaTransaction`
- [x] Ensure no `Payment` is created in unresolved cases
- [x] Expose basic API/query for admin queue (backend only for now)

### 4. Tests & observability
- [ ] Unit tests for:
  - MSISDN normalization
  - `ADM123-TUI` parsing
  - Phone-number-first matching edge cases
  - Oldest-fee allocation logic
- [ ] Integration tests for C2B confirm happy path + unmatched cases
- [ ] Basic logging for unexpected payloads / failures

### 5. Future (v2+)
- [x] Admin UI for MpesaTransaction review queue
- [x] Phone number "learning" (map new payer numbers to existing students)
- [x] Support additional PayBill / Till short codes (e.g. dedicated Computer Studies PayBill `400200`)
