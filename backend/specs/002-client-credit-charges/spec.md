# Feature Specification: Client Credit, Reminders & Shop Charges

**Feature Branch**: `002-client-credit-charges`  
**Created**: 2026-06-23  
**Status**: Draft  
**Input**: User description: "Done with MVP — complete retail platform with registered client catalog, partial payment and pay-later credit at POS, client balance ledger, credit reminders for owners, and shop operating charges with reporting. Builds on 001-retail-platform."

## Scope overview

| In scope (this feature) | Out of scope |
|-------------------------|--------------|
| Registered client catalog (in-store customers) | Online guest checkout on credit |
| POS partial pay + pay-later tied to clients | Payment gateway / card processing |
| Client balance ledger + payment receipts | Workshop / galatk integration changes |
| Credit reminder list + follow-up logging | SMS / WhatsApp reminders (in-app only v1) |
| Shop operating charges + void audit | Payroll, supplier inventory purchases |
| Owner/manager financial summary (sales vs credit owed vs charges) | Full accounting / general ledger |

**Prerequisite**: [001-retail-platform](../001-retail-platform/spec.md) MVP (POS, stock, admin, storefront) is deployed and stable.

## Clarifications

### Session 2026-06-23

- Q: For partial-pay POS sales, what counts as “sales collected” in the financial summary? → A: **Paid at checkout only** — sum of amount actually paid at sale time; credit portion appears in outstanding client balance, not in collected sales.
- Q: Who can record standalone client payments (debt pay-down, not a new sale)? → A: **Cashier and manager** — both may record payments for their shop; manager/owner voids mistaken payments.
- Q: When a client has no credit limit set, what applies? → A: **Unlimited credit** — no cap until a limit is configured; optional limit enforces FR-005 when present.
- Q: How do standalone client debt payments appear in the financial summary? → A: **Separate line** — “Client payments received” distinct from POS collected; optional total cash in combining both.
- Q: Client phone number uniqueness rules? → A: **Unique per network** — one phone number may not be registered on more than one client across all shops (client record still belongs to a single shop).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Client Catalog (Priority: P1)

An owner or manager maintains a **catalog of registered clients** (regular in-store customers) with contact details, optional notes, and optional **credit limit**. Staff can find clients quickly at the register.

**Why this priority**: Credit sales require a stable client identity; catalog is the foundation for all ledger activity.

**Independent Test**: Create two clients with different phone numbers → search by name → open profile showing zero balance and empty history.

**Acceptance Scenarios**:

1. **Given** a manager, **When** they add a client with name and phone, **Then** the client appears in the shop catalog and is searchable, provided the phone is not already used by any client in the network.
2. **Given** an existing client, **When** a manager updates contact details or credit limit, **Then** changes persist and appear on the client profile; phone change MUST remain unique across the network.
3. **Given** a cashier, **When** they open POS client picker, **Then** they can search and select a client but cannot delete clients or change credit limits.

---

### User Story 2 - Credit Sales at POS (Priority: P1)

At checkout, staff link a sale to a **registered client** and record **full pay**, **partial payment** (e.g. 50% now), or **pay-later** (zero upfront, trusted client). Product leaves the shop; stock decrements as today; unpaid amount increases the client’s **outstanding balance**.

**Why this priority**: Core business need — clients take goods before paying in full.

**Independent Test**: Client with limit 1000 → sale total 200 with 100 paid → balance +100; pay-later sale 150 → balance +250; stock decrements each time.

**Acceptance Scenarios**:

1. **Given** a selected client and cart, **When** cashier completes sale with amount paid less than total, **Then** sale records paid amount, credit amount, links to client, and client balance increases by the unpaid portion.
2. **Given** a selected client, **When** manager authorizes pay-later (full amount on credit), **Then** sale completes with zero paid at checkout and full total added to client balance.
3. **Given** a client with **no credit limit** configured, **When** staff attempt partial pay or pay-later, **Then** sale is allowed subject to other rules (pay-later still requires manager authorization); limit checks are skipped until a limit is set.
4. **Given** a client with credit limit set, **When** a new credit would exceed the limit, **Then** sale is blocked unless a manager approves the override (logged with approver name).
5. **Given** a completed credit sale, **When** manager voids the sale, **Then** sale is cancelled (same void rules as MVP where applicable), stock restored, and client balance reduced by the credit portion previously added.

---

### User Story 3 - Record Client Payments (Priority: P1)

When a client returns to pay down debt, staff record a **payment receipt** against the client (not tied to a new product sale). Balance decreases; ledger shows who recorded payment and when.

**Why this priority**: Without payment entry, balances never clear and reminders are meaningless.

**Independent Test**: Client owes 250 → record payment 100 → balance 150 → record 150 → balance 0.

**Acceptance Scenarios**:

1. **Given** a client with outstanding balance, **When** cashier or manager records a payment, **Then** balance decreases by payment amount and cannot go below zero.
2. **Given** a client with multiple open credit portions, **When** a payment is recorded without manual allocation, **Then** system applies payment to **oldest debt first** (FIFO).
3. **Given** a payment recorded in error, **When** a manager voids it with reason, **Then** balance is restored and audit shows **voided by [staff name]** and timestamp.

---

### User Story 4 - Client Profile & Ledger History (Priority: P2)

Managers and owners view a client profile: current balance, list of credit sales, payments, adjustments, and running history sufficient to answer “what do they owe and why?”

**Why this priority**: Operational trust and dispute resolution.

**Independent Test**: After mixed sales and payments, profile totals match sum of ledger lines.

**Acceptance Scenarios**:

1. **Given** a client with activity, **When** manager opens profile, **Then** they see current balance, chronological ledger, and linked sale references.
2. **Given** owner role, **When** viewing clients across shops in network, **Then** each client’s balance is shown **per shop** (clients belong to one shop).

---

### User Story 5 - Credit Reminders (Priority: P2)

Owner or manager sees **who owes money**, how much, and how long the oldest unpaid portion has been outstanding. They use an in-app **reminder list** to follow up and log contact.

**Why this priority**: Prevents forgotten debt and cash-flow surprises.

**Independent Test**: Two clients — one debt 5 days old, one 40 days — with 30-day threshold → only second appears on reminder list.

**Acceptance Scenarios**:

1. **Given** clients with balance &gt; 0, **When** owner opens credit dashboard, **Then** they see client name, amount owed, oldest debt age, and shop.
2. **Given** shop reminder threshold (default 30 days outstanding), **When** oldest unpaid portion exceeds threshold, **Then** client appears on reminder list sorted by age or amount.
3. **Given** a client on the reminder list, **When** staff marks as contacted, **Then** log stores date, **contacted by [staff name]**, optional note; client may remain on list until balance is zero.

---

### User Story 6 - Shop Operating Charges (Priority: P2)

Owner or manager records **shop charges** — money spent running the shop (team food, petty cash, misc operational spend) — separate from inventory and client credit.

**Why this priority**: Owner needs true cash picture: money in (sales) vs money out (charges) vs money owed (client credit).

**Independent Test**: Record charge “team food” 200 → charges ledger shows entry with recorder name → period summary includes 200 in charges.

**Acceptance Scenarios**:

1. **Given** authorized manager/owner, **When** they record a charge with category, amount, date, optional note, **Then** entry appears in shop charges ledger with **recorded by [staff name]**.
2. **Given** a charge recorded in error, **When** manager voids with reason, **Then** charge status is cancelled with audit trail (same discipline as sale voids).
3. **Given** cashiers, **When** they attempt to record or void charges, **Then** action is denied.

---

### User Story 7 - Owner Financial Summary (Priority: P3)

Owner views a period summary per shop: **cash sales collected**, **outstanding client credit** (asset), **operating charges** (outflow), and simple net view (sales minus charges; credit outstanding shown separately).

**Why this priority**: Ties sales, credit, and charges into one operational dashboard.

**Independent Test**: For a day with sales 1000, charges 200, client credit outstanding 300 → summary shows all three figures clearly.

**Acceptance Scenarios**:

1. **Given** a date range, **When** owner opens financial summary, **Then** they see **POS cash/card collected** (amount paid at checkout on sales), **client payments received** (standalone debt pay-downs, separate line), optional **total cash in** (sum of those two), **total charges**, and **total outstanding client credit**.
2. **Given** network owner, **When** viewing all shops, **Then** each shop’s figures are separate with optional network totals.

---

### Edge Cases

- Client deleted while balance &gt; 0 → block deletion; allow deactivate/hide from picker only.
- Client phone already used in another shop → block create/update with clear message; owner may reassign only by deactivating or correcting the existing record.
- Partial pay with wrong amount entered → validate paid + credit = sale total before commit.
- Manager override over credit limit → require explicit confirmation; log approver on sale.
- Void credit sale after client made payments toward that sale → void restores stock and reverses credit portion; if payments already allocated, manager must adjust manually (adjustment entry) or void payments first.
- Pay-later at POS: **manager-only** at MVP extension (cashier must call manager to authorize zero-upfront).
- Online orders remain **guest prepay / COD** — no registered client credit online in this feature.
- Charges are **shop-scoped**; network owner sees rollup only, not shared charge pool.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support a **registered client** catalog scoped to a shop with name, phone (required, **unique across the entire shop network**), optional email/address/notes, optional credit limit (null = unlimited), and active/inactive flag.
- **FR-002**: System MUST allow POS sales to optionally link a **registered client**; guest sales without client remain supported unchanged.
- **FR-003**: System MUST support POS checkout modes: **full pay** (existing), **partial pay** (amount paid + remainder on credit), and **pay-later** (full amount on credit at zero upfront).
- **FR-004**: Partial pay and pay-later MUST increase client **outstanding balance** by the unpaid portion atomically with sale completion and stock decrement.
- **FR-005**: System MUST enforce **credit limit** when configured on a client; exceeding limit MUST block sale unless manager override is recorded with approver identity. When **no credit limit is set**, credit sales are **unlimited** (no cap) until a limit is added.
- **FR-006**: **Pay-later** (zero upfront) MUST require **manager or owner** authorization at time of sale.
- **FR-007**: System MUST record **client payments** independent of sales, decreasing balance; payments MUST NOT exceed current balance. **Cashiers and managers** MAY record payments for their assigned shop; only **managers and owners** MAY void payments.
- **FR-008**: Unallocated client payments MUST apply to outstanding credit using **FIFO (oldest debt first)**.
- **FR-009**: System MUST maintain an auditable **client ledger** (credit from sales, payments, manager adjustments, void reversals) with staff attribution and timestamps.
- **FR-010**: Void of a credit sale MUST follow MVP void rules for stock and sale status, and MUST reverse the credit amount from client balance.
- **FR-011**: System MUST provide a **credit dashboard** listing clients with balance &gt; 0, amount owed, and age of oldest unpaid portion.
- **FR-012**: System MUST support configurable **reminder threshold** (days outstanding, shop-level default 30) and a reminder list filtered by that threshold.
- **FR-013**: System MUST log **reminder contact** events (contacted by, date, optional note).
- **FR-014**: System MUST support **shop charges** with category (preset list + custom), amount, date, note, shop scope, and recorded-by staff.
- **FR-015**: Only **manager and owner** MAY create, view, and void shop charges.
- **FR-016**: System MUST extend owner/manager **period summary** with: (1) **POS collected** — sum of `amountPaid` on completed sales in the period; (2) **Client payments received** — sum of standalone debt payments in the period (separate line, not counted as sales revenue); (3) optional **total cash in** — POS collected + client payments received; (4) **total outstanding client credit**; (5) **total charges**. Unpaid credit portions from partial sales MUST NOT appear in POS collected.
- **FR-017**: Cashiers MAY select clients, complete **partial pay** sales, and **record client payments**; pay-later and credit-limit override remain manager/owner only.
- **FR-018**: Online storefront MUST NOT offer client credit or pay-later in this feature.

### Key Entities

- **Registered Client**: Shop-scoped customer identity; contact fields, optional credit limit (null = unlimited credit), active flag, current balance (derived or stored with ledger reconciliation).
- **Client Ledger Entry**: Type (SALE_CREDIT, PAYMENT, ADJUSTMENT, VOID_REVERSAL); amount; clientId; optional saleId/paymentId; recordedBy; timestamp; note.
- **Client Payment**: Standalone receipt reducing balance; method (cash/card); amount; recordedBy.
- **Credit Reminder Contact Log**: clientId, contactedBy, contactedAt, note; optional link to reminder snapshot.
- **Shop Charge**: shopId, category, amount, chargeDate, note, status (active/cancelled), recordedBy, cancelledBy/audit fields.
- **Sale (extended)**: amountPaid (counts toward collected sales), amountOnCredit (adds to client balance only), creditApprovedBy (nullable), links to clientId (existing column activated).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Manager can create a client and complete a partial-pay POS sale in under 3 minutes.
- **SC-002**: 100% of credit sales and payments reconcile to client balance in acceptance testing (no unexplained drift).
- **SC-003**: Owner can open credit dashboard and identify all debtors and total owed within 30 seconds.
- **SC-004**: Reminder list correctly includes only clients past threshold in 100% of seeded test cases.
- **SC-005**: Shop charges and sales appear together in period summary without external spreadsheet.
- **SC-006**: Pay-later sale without manager authorization is rejected in 100% of cashier-only test attempts.

## Assumptions

- **MVP stable**: POS, stock, void rules, and admin from 001 are production-ready; `Sale.clientId` column exists but is unused until this feature.
- **In-store only**: Credit applies to POS registered clients, not online guest checkout.
- **Currency**: Single currency; same as MVP.
- **Reminder channel**: In-app list and optional printable/export view; no SMS/email in v1.
- **Client scope**: Each client record belongs to **one shop**; **phone number is unique network-wide** (no duplicate phones across shops).
- **Credit limit**: Null/blank limit means **unlimited** client credit; setting a limit enables enforcement and override flow.
- **Charge categories**: Seed defaults (e.g. team food, petty cash, transport, other); managers can use “other” with note.
- **Sales collected reporting**: Period **POS collected** uses **amount paid at checkout** only. **Client payments received** are reported separately. Optional **total cash in** combines both for drawer reconciliation; neither line double-counts unpaid credit from sales.
- **Repository layout (planning)**: Backend modules `clients`, `credit`, `charges`; extend `pos` and `dashboard`; frontend admin + POS views under existing layouts.

## Dependencies

- **001-retail-platform**: POS sales, void policy, staff roles, shop scoping, dashboard module.
- **No galatk API**: Workshop system unchanged.

## References

- Prior scope and Phase 3 intent: [001-retail-platform/spec.md](../001-retail-platform/spec.md) (FR-016–FR-021, SC-007–SC-009)
