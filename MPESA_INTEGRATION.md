# M‑Pesa Integration Plan (v1)

## 0. Implementation Status

- **DONE**
  - Data model changes:
    - `PaymentMethod` enum extended with `MPESA` in `prisma/schema.prisma`.
    - `MpesaTransaction` model and `MpesaTransactionStatus` enum added with relations to `StudentFee` and `Payment`.
  - TypeScript / validation:
    - `PaymentMethod` union in `src/lib/fees.actions.ts` extended with `"MPESA"`.
    - `studentFeePaymentSchema` in `src/lib/formValidationSchemas.ts` now accepts `"MPESA"`.
  - Shared payment helper:
    - `applyStudentFeePayment` implemented in `src/lib/studentFeePayments.ts` and used by `/api/payments`.
  - M‑Pesa API endpoints (backend):
    - `POST /api/mpesa/initiate` implemented with auth, validation, `MpesaTransaction` creation and real Daraja STK push integration.
    - `POST /api/mpesa/callback` implemented using the real Daraja STK callback shape (`Body.stkCallback...`), updating `MpesaTransaction` and creating `Payment` via `applyStudentFeePayment`.
  - Parent UI wiring:
    - `StudentFeePaymentFormInline` now offers `MPESA` as a method, collects phone number, and calls `/api/mpesa/initiate` via `useInitiateMpesaPayment`.

- **TODO (next)**
  - Optional: status polling or better UX around pending M‑Pesa transactions.
  - Full C2B PayBill/Till ingestion (Daraja C2B APIs) for payments initiated outside the portal.

## 1. Objectives & Scope

- **Primary goal**
  - Enable parents to pay school fees via M‑Pesa from the parent portal, with automatic update of `StudentFee` balances and payment history.

- **In scope (v1)**
  - STK push based payments (Lipa na M‑Pesa Online) for parents.
  - Automatic confirmation via Safaricom callback.
  - Mapping each successful M‑Pesa transaction to a `Payment` linked to a `StudentFee`.

- **Out of scope (for now)**
  - Reversals/refunds.
  - Paybill incoming reconciliation for generic payments (no `StudentFeeId`).
  - Partial automation of existing manual payment methods (cash, bank transfer, etc.).

---

## 2. High‑Level Architecture

- **Frontend (Parent Portal)**
  - Extend existing `StudentFeePaymentFormInline` (or a new M‑Pesa modal) to:
    - Allow selecting `MPESA` as a method.
    - Capture phone number (and optionally name).
    - Call a new backend endpoint to **initiate** M‑Pesa payment.
  - Show payment status (pending / successful / failed) in the UI, not just "recorded".

- **Backend (Next.js API)**
  - New endpoints under `/api/mpesa` (or `/api/payments/mpesa`):
    - **Initiate**: start STK push and create a pending record.
    - **Callback**: receive Safaricom result and finalize payment.
  - Reuse core accounting logic to:
    - Create `Payment` rows and update `StudentFee` balances when M‑Pesa confirms success.

- **Database / Prisma**
  - Extend enums + add a dedicated table for M‑Pesa transaction metadata.

---

## 3. Data Model Changes

- **3.1. Payment method**

  - **Add** `MPESA` to `PaymentMethod` enum in `prisma/schema.prisma`:
    - `enum PaymentMethod { CASH BANK_TRANSFER POS ONLINE MPESA }`
  - Update:
    - `Payment.method` usage.
    - Validation schema `studentFeePaymentSchema` to allow `"MPESA"` where appropriate.
    - Client `methods` array in `StudentFeePaymentFormInline`.

- **3.2. M‑Pesa transaction tracking**

  - **New model** `MpesaTransaction` (name TBD) to store gateway‑specific data, e.g.:

    - **Core fields**
      - `id` (PK).
      - `studentFeeId` (nullable until mapping known, or required).
      - `paymentId` (FK to `Payment`, nullable until confirmed).
      - `phoneNumber`.
      - `amount` (minor units).
      - `status` (`PENDING`, `SUCCESS`, `FAILED`).
      - `checkoutRequestId`, `merchantRequestId`.
      - `mpesaReceiptNumber`.
      - `rawCallback` (JSON).

    - **Indexing**
      - Index on `checkoutRequestId`.
      - Index on `mpesaReceiptNumber`.

- **3.3. School payment configuration**

  - Reuse `SchoolPaymentInfo` for M‑Pesa Paybill / Till:
    - Insert a record like `name = "MPESA_PAYBILL"`, `data` JSON with:
      - `shortCode`, `passKey`, `callbackUrl` (or base).
  - Later add admin UI to manage these settings.

---

## 4. Payment Flow Design

### 4.1. Parent initiation (Frontend)

- **Changes to UI**
  - In `StudentFeePaymentFormInline`:
    - Add `MPESA` to method list.
    - If method === `MPESA`:
      - Show `phoneNumber` input (pre‑filled from parent profile if available).
      - Hide manual `reference` (will be auto from M‑Pesa).
      - Submit to `/api/mpesa/initiate` instead of `/api/payments`.

- **User journey**
  - Parent chooses `MPESA`, enters amount and phone number.
  - Clicks "Pay via M‑Pesa".
  - UI shows "Request sent, check your phone to authorize" + pending state.
  - Polls or listens via React Query to `GET /api/mpesa/status?transactionId=...` (optional v2).

### 4.2. Backend: Initiate STK Push

- **New endpoint** `POST /api/mpesa/initiate`
  - Auth:
    - Parent, admin, accountant allowed (similar to current `/api/payments`).
  - Request body:
    - `studentFeeId`, `amount` (KES), `phoneNumber`.
  - Steps:
    - Validate fee ownership (parent owns child).
    - Convert amount to minor units.
    - Create `MpesaTransaction` with `status = PENDING`.
    - Call Safaricom STK push API using configured credentials.
    - Store `checkoutRequestId`, `merchantRequestId` in `MpesaTransaction`.
    - Return to client:
      - `transactionId`, `status: "PENDING"`.

### 4.3. Backend: Callback / Confirmation

- **New endpoint** `POST /api/mpesa/callback`
  - Public endpoint called by Safaricom.
  - Steps:
    - Validate authenticity (IP/host + hash/signature as available).
    - Parse payload:
      - Extract `checkoutRequestId`, `ResultCode`, `ResultDesc`, `Amount`, `MpesaReceiptNumber`, `Msisdn`, etc.
    - Lookup corresponding `MpesaTransaction` by `checkoutRequestId`.
    - If `ResultCode === 0` (success):
      - Inside a transaction:
        - Call shared internal function to:
          - Create `Payment` row with:
            - `studentFeeId`, `amount`, `method = MPESA`, `reference = MpesaReceiptNumber`.
          - Update `StudentFee.amountPaid` and `status` (reuse logic from `/api/payments`).
        - Update `MpesaTransaction.status = SUCCESS`, link `paymentId`, store metadata.
    - If failure:
      - Mark `MpesaTransaction.status = FAILED` with error message.

### 4.4. Reuse of existing logic

- Extract a shared **"applyPaymentToStudentFee"** helper from `POST /api/payments`:
  - Inputs: `studentFeeId`, `amountMinor`, `method`, `reference?`.
  - Responsibilities:
    - Load fee.
    - Compute new `amountPaid` and `status`.
    - Create `Payment`, update `StudentFee`.
  - Use it from:
    - Existing manual `/api/payments` route.
    - New M‑Pesa callback handler.

### 4.5. C2B PayBill/Till ingestion (future phase)

- **Goal**
  - Ingest *all* payments sent to your PayBill/Till (even when not initiated via STK push from the portal), using Daraja C2B APIs.

- **Daraja C2B pieces**
  - `C2BRegisterURL` – register your **ValidationURL** and **ConfirmationURL** for a given shortcode.
  - **C2B callbacks** – Safaricom calls your URLs for every customer-to-business payment:
    - `ValidationURL` can accept/reject transactions.
    - `ConfirmationURL` confirms successful transactions and provides transaction details.

- **Planned flow**
  - Expose two new endpoints, e.g.:
    - `POST /api/mpesa/c2b/validate` – optional validation logic (can accept all or enforce basic rules).
    - `POST /api/mpesa/c2b/confirm` – main ingestion point for C2B payments.
  - In `confirm` handler:
    - Parse C2B payload (shortcode, MSISDN, amount, account reference, M-Pesa receipt number, timestamp).
    - Create a `MpesaTransaction` row if one doesn2t exist.
    - Apply or queue a `Payment`:
      - If `accountReference` uniquely identifies a `StudentFee` or student, call shared payment helper to create a `Payment` and update `StudentFee`.
      - Otherwise, record as **unmatched** and surface for manual reconciliation in admin UI.
    - Always respond with the structure Daraja expects (ACK) so Safaricom doesn2t keep retrying.

- **Reconciliation & admin UX (future detail)**
  - Add an admin view for unmatched C2B payments where an accountant can:
    - Search by receipt number, phone number, or amount.
    - Manually link a transaction to a `StudentFee`.
  - Once linked, use `applyStudentFeePayment` to create the corresponding `Payment` and update balances.

---

## 5. UI / UX Enhancements

- **Status feedback**
  - Show per‑transaction status in `StudentFeePaymentsHistory`:
    - Payment method, reference, and whether it came from M‑Pesa.
  - For pending M‑Pesa transactions:
    - Show "Awaiting confirmation" (v2: a separate view of pending `MpesaTransaction`s).

- **Error handling**
  - If STK push initiation fails:
    - Show a clear toast: "Could not contact M‑Pesa. Please try again later."
  - If callback marks failed:
    - Expose a message in history or notifications.

---

## 6. Security & Compliance

- **Secrets management**
  - Store M‑Pesa credentials in environment variables (never in code).
  - Example: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`.

- **Callback security**
  - Restrict callback URL visibility (not easily guessable).
  - Validate:
    - Host/IP range or TLS certificate (where possible).
    - Request body signature/hash if Safaricom supports it for the used product.

- **Data protection**
  - Avoid logging full payloads with PII in production.
  - Mask phone numbers in logs where reasonable.

---

## 7. Rollout Plan

- **Phase 0 – Current state**
  - Keep existing manual `/api/payments` as primary mechanism.

- **Phase 1 – Sandbox integration**
  - Implement models + endpoints against Safaricom sandbox.
  - Feature flag: enable M‑Pesa option only for test users/admin.

- **Phase 2 – Production pilot**
  - Configure real Paybill/Till credentials.
  - Enable M‑Pesa for a small set of parents.
  - Closely monitor logs and balances.

- **Phase 3 – Full rollout**
  - Enable for all parents.
  - Optionally:
    - Limit manual payment entry in parent portal.
    - Keep manual flow for accountants/admins only.

---

## 8. Open Questions / To‑Decide

- **[ ]** Exact URL structure: `/api/mpesa/*` vs `/api/payments/mpesa/*`.
- **[ ]** Whether to support both STK push and generic Paybill reconciliation.
- **[ ]** How to expose pending/failed M‑Pesa attempts to parents (UI design).
- **[ ]** Admin tooling for MPesa config and transaction search.
