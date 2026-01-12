# M-Pesa Integration Checklist for School Fees System

This document lists **everything the school/client must provide or set up** so that:

- STK push (`/api/mpesa/initiate` + `/api/mpesa/callback`)
- C2B PayBill (529914, 400200)
- C2B Till (5669463)

all work end‑to‑end with this application.

---

## 1. Safaricom & Bank Accounts to Have in Place

### 1.1 Safaricom / M-Pesa Side

- **[Required] Daraja (M-Pesa API) Business Account**
  - Business portal access for creating apps and managing:
    - Consumer Key / Consumer Secret
    - PayBill / Till short codes
    - C2B validation/confirmation URLs

- **[Required] STK Push Short Code**
  - A PayBill/short code that will be used by `MPESA_SHORTCODE` in this app.
  - Often:
    - Either a dedicated school PayBill, or
    - The shared one if that’s what you’ve agreed (check with the bank / Safaricom).
  - Must support **Lipa na M-Pesa Online (STK Push)**.

- **[Required] PayBill Short Codes**
  - `529914` – **Legacy shared PayBill**, generic account `51029`.
    - Confirm this is valid for the client and that the school is allowed to receive and reconcile on it.
  - `400200` – **Dedicated Computer Studies PayBill**.
    - Confirm ownership and that it is active.

- **[Required] M-Pesa Till Number**
  - `5669463` – shared till for **general school fees** (excluding Computer Studies).

### 1.2 Bank / Settlement Side

For each collection channel, confirm with the client & bank:

- **Settlement account details**
  - Which bank account receives:
    - PayBill `529914` + account `51029` collections
    - PayBill `400200` collections
    - Till `5669463` collections

- **Statement / access**
  - Ability to get statements (CSV/PDF/API) for:
    - The bank account that receives 529914/51029
    - The bank account that receives 400200
    - The bank account that receives 5669463
  - This is needed for **external reconciliation** against what the app records.

---

## 2. URLs & Routing to Configure in Safaricom Portal

Assume your production app is hosted at:

- `https://<your-school-domain>` (public, HTTPS, stable)

### 2.1 STK Push (Lipa na M-Pesa Online)

In Daraja configuration:

- **ShortCode**: set to the same value you will put in `MPESA_SHORTCODE`.
- **PassKey**: obtain the STK passkey for that shortcode.
- **Callback URL**: configure to:

  - `https://<your-school-domain>/api/mpesa/callback`

The app:

- Uses `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`.
- Calls Safaricom `mpesa/stkpush/v1/processrequest`.
- Receives STK callback at `/api/mpesa/callback` and records `MpesaTransaction` + `Payment`.

### 2.2 C2B PayBill 529914 (Shared, BillRef 51029)

On the Safaricom / Daraja C2B configuration **for shortcode 529914**:

- **Validation URL** (optional in v1 design, but safe to set):
  - `https://<your-school-domain>/api/mpesa/c2b/validate`
- **Confirmation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/confirm`
- **Response Type**:
  - Usually `Completed` (so funds are posted even if your system is down).

Important for this app:

- When **BusinessShortCode = 529914** and **BillRefNumber = 51029**:
  - The app treats payment as **shared/general school fees**.
  - Phone‑first matching (parent/student/alias).
  - Allocates to **oldest outstanding StudentFee** for that student.

### 2.3 C2B PayBill 400200 (Dedicated Computer Studies)

On C2B config **for shortcode 400200**:

- **Validation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/validate`
- **Confirmation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/confirm`

Behavior in this app:

- If **BusinessShortCode = 400200** and **BillRefNumber = 01109613617800**:
  - Treat as **Computer Studies–only wallet**:
    - Phone‑first matching.
    - Allocates only to oldest outstanding `Computer Studies` `StudentFee`.
- Any other BillRef under `400200` → recorded as `PENDING` with `reviewReason = OTHER`.

### 2.4 C2B Till 5669463 (Shared Till)

On C2B config **for till 5669463**:

- **Validation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/validate`
- **Confirmation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/confirm`

Behavior in this app:

- If **BusinessShortCode = 5669463** (till):
  - Phone‑first matching.
  - Allocates to oldest outstanding **non–Computer Studies** `StudentFee`.
  - Explicitly **does not** allocate Computer Studies fees (those use `400200`).

---

## 3. Environment Variables to Configure (Server)

On the server hosting this Next.js app (production):

```env
# M-Pesa environment
MPESA_ENV=production            # or 'sandbox' while testing

# Daraja app credentials
MPESA_CONSUMER_KEY=xxxxxxxxxxxx
MPESA_CONSUMER_SECRET=yyyyyyyyyyyy

# STK push configuration
MPESA_SHORTCODE=123456          # ShortCode used for STK push (confirm with Safaricom)
MPESA_PASSKEY=zzzzzzzzzzzzzzzz  # STK passkey for that shortcode
MPESA_CALLBACK_URL=https://<your-school-domain>/api/mpesa/callback





I’ll summarize all external setups and credentials needed for these M-Pesa flows (PayBills, till, Daraja app, callback URLs, etc.) and present them as a structured markdown “checklist” you can use with the client and their bank. I’ll base concrete details (like env var names and URLs) on your existing `initiate`/`callback` endpoints so I don’t invent anything.

```markdown
# M-Pesa Integration Checklist for School Fees System

This document lists **everything the school/client must provide or set up** so that:

- STK push (`/api/mpesa/initiate` + `/api/mpesa/callback`)
- C2B PayBill (529914, 400200)
- C2B Till (5669463)

all work end‑to‑end with this application.

---

## 1. Safaricom & Bank Accounts to Have in Place

### 1.1 Safaricom / M-Pesa Side

- **[Required] Daraja (M-Pesa API) Business Account**
  - Business portal access for creating apps and managing:
    - Consumer Key / Consumer Secret
    - PayBill / Till short codes
    - C2B validation/confirmation URLs

- **[Required] STK Push Short Code**
  - A PayBill/short code that will be used by `MPESA_SHORTCODE` in this app.
  - Often:
    - Either a dedicated school PayBill, or
    - The shared one if that’s what you’ve agreed (check with the bank / Safaricom).
  - Must support **Lipa na M-Pesa Online (STK Push)**.

- **[Required] PayBill Short Codes**
  - `529914` – **Legacy shared PayBill**, generic account `51029`.
    - Confirm this is valid for the client and that the school is allowed to receive and reconcile on it.
  - `400200` – **Dedicated Computer Studies PayBill**.
    - Confirm ownership and that it is active.

- **[Required] M-Pesa Till Number**
  - `5669463` – shared till for **general school fees** (excluding Computer Studies).

### 1.2 Bank / Settlement Side

For each collection channel, confirm with the client & bank:

- **Settlement account details**
  - Which bank account receives:
    - PayBill `529914` + account `51029` collections
    - PayBill `400200` collections
    - Till `5669463` collections

- **Statement / access**
  - Ability to get statements (CSV/PDF/API) for:
    - The bank account that receives 529914/51029
    - The bank account that receives 400200
    - The bank account that receives 5669463
  - This is needed for **external reconciliation** against what the app records.

---

## 2. URLs & Routing to Configure in Safaricom Portal

Assume your production app is hosted at:

- `https://<your-school-domain>` (public, HTTPS, stable)

### 2.1 STK Push (Lipa na M-Pesa Online)

In Daraja configuration:

- **ShortCode**: set to the same value you will put in `MPESA_SHORTCODE`.
- **PassKey**: obtain the STK passkey for that shortcode.
- **Callback URL**: configure to:

  - `https://<your-school-domain>/api/mpesa/callback`

The app:

- Uses `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`.
- Calls Safaricom `mpesa/stkpush/v1/processrequest`.
- Receives STK callback at `/api/mpesa/callback` and records `MpesaTransaction` + `Payment`.

### 2.2 C2B PayBill 529914 (Shared, BillRef 51029)

On the Safaricom / Daraja C2B configuration **for shortcode 529914**:

- **Validation URL** (optional in v1 design, but safe to set):
  - `https://<your-school-domain>/api/mpesa/c2b/validate`
- **Confirmation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/confirm`
- **Response Type**:
  - Usually `Completed` (so funds are posted even if your system is down).

Important for this app:

- When **BusinessShortCode = 529914** and **BillRefNumber = 51029**:
  - The app treats payment as **shared/general school fees**.
  - Phone‑first matching (parent/student/alias).
  - Allocates to **oldest outstanding StudentFee** for that student.

### 2.3 C2B PayBill 400200 (Dedicated Computer Studies)

On C2B config **for shortcode 400200**:

- **Validation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/validate`
- **Confirmation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/confirm`

Behavior in this app:

- If **BusinessShortCode = 400200** and **BillRefNumber = 01109613617800**:
  - Treat as **Computer Studies–only wallet**:
    - Phone‑first matching.
    - Allocates only to oldest outstanding `Computer Studies` `StudentFee`.
- Any other BillRef under `400200` → recorded as `PENDING` with `reviewReason = OTHER`.

### 2.4 C2B Till 5669463 (Shared Till)

On C2B config **for till 5669463**:

- **Validation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/validate`
- **Confirmation URL**:
  - `https://<your-school-domain>/api/mpesa/c2b/confirm`

Behavior in this app:

- If **BusinessShortCode = 5669463** (till):
  - Phone‑first matching.
  - Allocates to oldest outstanding **non–Computer Studies** `StudentFee`.
  - Explicitly **does not** allocate Computer Studies fees (those use `400200`).

---

## 3. Environment Variables to Configure (Server)

On the server hosting this Next.js app (production):

```env
# M-Pesa environment
MPESA_ENV=production            # or 'sandbox' while testing

# Daraja app credentials
MPESA_CONSUMER_KEY=xxxxxxxxxxxx
MPESA_CONSUMER_SECRET=yyyyyyyyyyyy

# STK push configuration
MPESA_SHORTCODE=123456          # ShortCode used for STK push (confirm with Safaricom)
MPESA_PASSKEY=zzzzzzzzzzzzzzzz  # STK passkey for that shortcode
MPESA_CALLBACK_URL=https://<your-school-domain>/api/mpesa/callback
```

Notes:

- `MPESA_SHORTCODE` can be:
  - A dedicated school PayBill, or
  - Whatever code your Daraja STK push is provisioned against.
- C2B confirm/validate **do not** need extra env vars; they work based on `BusinessShortCode` and `BillRefNumber` sent by Safaricom.

Also ensure your normal app env is set (database, auth, etc.), but that’s outside M-Pesa scope.

---

## 4. School / Client Data Needed

To wire the integrations correctly, you should collect from the client:

1. **Legal entity / business name**
   - Used in Daraja registration, bank accounts, and PayBill/Till ownership.

2. **PayBill and Till details**
   - Confirmed short codes:
     - `529914` (shared, account `51029`)
     - `400200` (Computer Studies)
     - `5669463` (till)
   - Clarify:
     - Which entity owns them.
     - Which bank accounts they settle into.

3. **M-Pesa API details**
   - Daraja account owner & contact person.
   - Whether you or the client will:
     - Create the **Daraja app**, and
     - Share Consumer Key/Secret and STK Passkey with you.

4. **Domain & SSL**
   - Final production domain: `https://<your-school-domain>`.
   - Valid SSL certificate (not self-signed).
   - Confirm that:
     - The app will be reachable publicly at:
       - `/api/mpesa/initiate` (used by the UI)
       - `/api/mpesa/callback`
       - `/api/mpesa/c2b/validate`
       - `/api/mpesa/c2b/confirm`

5. **Reconciliation process**
   - Who will:
     - Check **M-Pesa/bank statements** against:
       - `MpesaTransaction` table
       - Payments in the app
     - Use the `/finance/mpesa-review` UI to clear `PENDING` items.

6. **Operational contacts**
   - Technical contact (for API issues, failing callbacks).
   - Finance contact (for settlement / reconciliation / misposted payments).
   - Safaricom account manager / bank relationship manager, if applicable.

---

## 5. Optional but Recommended

- **Sandbox setup**
  - A separate `.env` / deployment pointing to:
    - `MPESA_ENV=sandbox`
    - Sandbox Consumer Key/Secret
    - Sandbox ShortCode and PassKey
  - Sandbox callback URLs pointing to a staging domain:
    - `https://staging.<your-school-domain>/api/mpesa/...`

- **IP whitelisting / firewall**
  - Ensure the production host allows inbound HTTPS from Safaricom IP ranges to:
    - `/api/mpesa/callback`
    - `/api/mpesa/c2b/confirm`
    - `/api/mpesa/c2b/validate`

- **Documentation handed to the client**
  - Simple 1-page guide explaining:
    - Which PayBill/Till to use for:
      - **General fees** (529914, 51029 or Till 5669463)
      - **Computer Studies** (400200, 01109613617800)
    - That **phone number** is the primary key for matching deposits to students.

---

## 6. Quick Summary Checklist

- **From client:**
  - [ ] Confirm PayBill `529914` + account `51029` usable for general fees.
  - [ ] Confirm dedicated PayBill `400200` for Computer Studies.
  - [ ] Confirm till `5669463` for general fees (excluding Computer Studies).
  - [ ] Provide Daraja Consumer Key & Secret for production.
  - [ ] Provide STK ShortCode and PassKey (`MPESA_SHORTCODE`, `MPESA_PASSKEY`).
  - [ ] Provide production domain `https://<your-school-domain>`.

- **In Daraja / Safaricom portal:**
  - [ ] Set STK callback to `/api/mpesa/callback`.
  - [ ] Set C2B validate/confirm URLs for:
    - [ ] ShortCode 529914
    - [ ] ShortCode 400200
    - [ ] Till 5669463

- **In this app’s environment:**
  - [ ] Configure `MPESA_ENV`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`.
  - [ ] Configure `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`.
  - [ ] Deploy and ensure `npm run build` passes (already verified).

Once everything above is in place, all three channels (STK, PayBills, Till) will feed into the app with the phone‑first matching and allocation rules we’ve implemented.
```