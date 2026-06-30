# Feature Specification: Retail Platform (POS & Online Shop)

**Feature Branch**: `001-retail-platform`  
**Created**: 2026-06-23  
**Status**: Draft  
**Input**: User description: "Build the retail app — separate backend and frontend for POS and online shop. Backend organized by feature modules; frontend styled with Tailwind CSS. One shop initially, multi-shop later. Receives finished goods from the galatk workshop (MAIN_STOCK). In-store POS and customer-facing e-commerce per shop. **Later:** client catalog, credit/pay-later sales, payment reminders, and shop operating charges (e.g. team expenses)."

## Scope overview

| Phase | Focus |
|-------|--------|
| **MVP (P1–P2)** | Stock from workshop, POS, online shop, staff roles, void rules |
| **Phase 2 (P3–P4 in stories below)** | Multi-shop network |
| **Phase 3 (P5–P6)** | **Client catalog, credit sales, reminders, shop charges** — detailed rules to be expanded in a follow-on spec; data model and admin surfaces MUST be anticipated in planning so MVP does not block them |

## Clarifications

### Session 2026-06-23

- Q: How should retail integrate with the galatk workshop at MVP (manual vs API sync)? → A: Manual only — managers create retail products and record inbound receipts with optional galatk reference; no live workshop API at MVP.
- Q: When should online orders reduce or reserve shared shop stock (vs POS)? → A: At checkout — stock is reserved or decremented when the customer places the order.
- Q: Which online fulfillment modes are in scope at MVP? → A: Customer choice — checkout offers both pickup and delivery.
- Q: What delivery area and fee model apply at MVP? → A: Same city service area with a single flat delivery fee per shop (configurable by manager).
- Q: Who can void sales and cancel orders? → A: Cashier may void their own POS sale on the same calendar day (stock restored automatically); any staff cancellation MUST record status, timestamp, and **cancelled by [staff name]**; managers may void or cancel any sale or unfulfilled order.
- Q: Are client credit (pay later / partial pay) and shop charges in MVP? → A: **No** — deferred to Phase 3; owner/admin client catalog, credit balances, reminders, and shop charges will be specified in more detail later; planning MUST reserve modules and entities so POS can link sales to clients when added.

### Session 2026-06-23 (stakeholder extension)

- Stakeholder note: Some in-store clients pay **partially upfront** (e.g. 50%) or **take product now and pay later**; owner/admin need a **client catalog**, **credit balance** per client, **reminders** for outstanding amounts, and visibility of **shop charges** (operating expenses such as team food or petty cash). Full workflows TBD in a follow-on spec increment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Workshop Goods Into Shop Stock (Priority: P1)

A shop manager records that finished clothing from the workshop has arrived at the store. Quantities for each product increase in that shop’s sellable inventory, with a clear record of what was received and when.

**Why this priority**: Without inbound stock from production, neither POS nor online sales can operate. This is the bridge from the workshop system to retail.

**Independent Test**: Can be fully tested by creating a shop, registering products, recording an inbound shipment of known quantities, and verifying shop stock matches the receipt.

**Acceptance Scenarios**:

1. **Given** a shop exists and products are registered for sale, **When** the manager records an inbound transfer of 30 units of Product A, **Then** shop stock for Product A increases by 30 and a transfer record is stored.
2. **Given** an inbound transfer references a product not yet in the retail catalog, **When** the manager attempts to receive it, **Then** the action is blocked until the product is created manually in retail (optional galatk product reference may be entered at creation time).
3. **Given** a completed inbound transfer, **When** the manager views transfer history, **Then** they see date, product, quantity, shop, and who recorded it.

---

### User Story 2 - In-Store POS Sale (Priority: P1)

A cashier sells items at the register: finds products, adds them to a cart, completes payment, and prints or shows a receipt. Sold quantities are removed from that shop’s stock immediately.

**Why this priority**: The physical shop is the primary revenue channel at launch; POS must be reliable before scaling online or multi-shop.

**Independent Test**: Can be fully tested by selling 2 units of a product with 10 in stock and confirming stock becomes 8, a sale record exists, and totals match line prices.

**Acceptance Scenarios**:

1. **Given** Product A has 10 units in Shop 1 stock, **When** the cashier sells 2 units at the register, **Then** shop stock becomes 8 and a completed sale is recorded with line items and total.
2. **Given** Product B has 0 units in shop stock, **When** the cashier tries to add it to the cart, **Then** the system prevents the sale or warns that stock is insufficient.
3. **Given** a completed sale, **When** the cashier views the sale summary, **Then** they see items, quantities, unit prices, subtotal, and payment method.
4. **Given** a POS sale completed today by the logged-in cashier, **When** they void that sale, **Then** the sale is marked cancelled with **cancelled by [cashier name]** and timestamp, and shop stock for all line items is restored.
5. **Given** a POS sale completed today by a different cashier, **When** a cashier attempts to void it, **Then** the action is denied unless a manager performs the void.

---

### User Story 3 - Customer Online Browse and Purchase (Priority: P2)

A customer visits the shop’s public web storefront, browses available products (only what is in stock for that shop or configured as sellable online), adds items to a cart, and places an order choosing **pickup at the shop** or **delivery** to an address within the service area.

**Why this priority**: Extends reach beyond walk-in customers; depends on accurate shop stock from Stories 1–2.

**Independent Test**: Can be fully tested by placing an online order for in-stock items and verifying stock decreases (or is reserved) and the customer receives order confirmation with a reference number.

**Acceptance Scenarios**:

1. **Given** Product A is in stock and marked available online, **When** a customer adds it to cart and completes checkout, **Then** an order is created with status “pending fulfillment”, shop stock for Product A is reduced immediately (same pool as POS), and the unit is no longer available for overselling.
2. **Given** Product B is out of stock, **When** a customer views the storefront, **Then** Product B is shown as unavailable or hidden according to shop policy.
3. **Given** a placed order, **When** the customer views order confirmation, **Then** they see order number, items, total, fulfillment type (pickup or delivery), and instructions (pickup location/time window or delivery address summary).
4. **Given** an unfulfilled online order, **When** authorized shop staff cancel it, **Then** the order status becomes cancelled, stock is restored, and the record shows **cancelled by [staff name]** and timestamp.

---

### User Story 4 - Shop Administration and Staff Access (Priority: P2)

An owner or manager configures the shop (name, address, contact), manages which staff can use POS and admin functions, and views sales and stock summaries for their location.

**Why this priority**: Operational control and accountability are required before multiple staff use the system daily.

**Independent Test**: Can be fully tested by creating staff accounts with POS-only access, logging in as cashier vs manager, and confirming each role sees only permitted actions.

**Acceptance Scenarios**:

1. **Given** a manager account, **When** they invite or create a cashier account, **Then** the cashier can log in and access POS (including void of own same-day sales) but cannot change shop settings or inbound transfers.
2. **Given** a manager, **When** they open the dashboard, **Then** they see today’s sales count, revenue total, and low-stock alerts for their shop.
3. **Given** invalid credentials, **When** a user attempts login, **Then** access is denied without exposing whether the email exists.

---

### User Story 5 - Multi-Shop Expansion (Priority: P3)

The business opens additional shops across the city. Each shop has isolated stock, staff, POS, and storefront, while a central owner can see all shops and allocate inbound goods from the workshop to the correct location.

**Why this priority**: Explicitly planned for later; architecture and data model must support it without rebuilding, but full rollout can follow single-shop MVP.

**Independent Test**: Can be fully tested by adding Shop 2, receiving stock only to Shop 2, selling from Shop 2 POS, and confirming Shop 1 stock is unchanged.

**Acceptance Scenarios**:

1. **Given** Shop 1 and Shop 2 exist, **When** stock is received into Shop 2 only, **Then** Shop 1 quantities are unaffected.
2. **Given** a central owner role, **When** they view the network overview, **Then** they see per-shop stock and sales summaries.
3. **Given** the same product sold in two shops the same day, **When** reports are generated, **Then** each shop’s sales are attributed to the correct location.

---

### User Story 6 - Client Catalog and Credit Sales (Priority: P5 — Phase 3, post-MVP)

An owner or shop manager maintains a **catalog of clients** (regular in-store customers), records sales on **credit** or **partial payment** (e.g. 50% now, balance later), lets trusted clients **take product before full payment**, and tracks each client’s **outstanding balance** with history of charges and payments.

**Why this priority**: Common in local retail relationships; depends on stable POS and client identity but is not required for first shop go-live.

**Independent Test**: Can be fully tested by creating a client, completing a POS sale with 50% paid and 50% on credit, verifying balance due, recording a later payment, and confirming balance clears.

**Acceptance Scenarios** (high level — details in follow-on spec):

1. **Given** a registered client, **When** a manager records a POS sale with partial payment, **Then** the sale shows amount paid, amount on credit, and the client’s **outstanding balance** increases by the unpaid portion.
2. **Given** a client with outstanding credit, **When** the client pays part or all of the balance, **Then** a payment is logged, balance decreases, and the ledger shows who recorded the payment and when.
3. **Given** a client approved for pay-later, **When** product is released with zero upfront payment, **Then** full sale amount is added to credit balance and stock still decrements per normal sale rules.
4. **Given** a manager views the client catalog, **When** they open a client profile, **Then** they see contact details, current **credit balance**, sale history, and payment history.

---

### User Story 7 - Credit Reminders and Owner Visibility (Priority: P5 — Phase 3, post-MVP)

An owner or manager sees **who owes money**, how much, and for how long, and can use **reminders** (in-app list and/or export) to follow up on overdue credit before amounts are forgotten.

**Why this priority**: Credit without reminders creates cash-flow risk; builds on Story 6.

**Independent Test**: Can be fully tested by creating two clients with different overdue balances and verifying the reminder view sorts/filters by amount and age.

**Acceptance Scenarios** (high level):

1. **Given** clients with outstanding balances, **When** the owner opens the credit dashboard, **Then** they see each client, **amount owed**, linked sales, and **age of oldest unpaid portion**.
2. **Given** configurable reminder thresholds (e.g. balance outstanding more than N days), **When** thresholds are met, **Then** clients appear on a **reminder list** for follow-up.
3. **Given** a reminder list, **When** the owner marks a reminder as contacted, **Then** the action is logged with date and staff name (optional note).

---

### User Story 8 - Shop Charges and Operating Expenses (Priority: P6 — Phase 3, post-MVP)

An owner or manager records **shop charges** — money spent on running the shop that is not inventory (e.g. food for the team, petty cash, small operational purchases) — so net shop performance reflects both **sales income** and **operating outflows**.

**Why this priority**: Owners need true picture of shop cash; separate from client credit (money owed **to** the shop) and from COGS.

**Independent Test**: Can be fully tested by recording a charge with category, amount, and date, then viewing a summary that includes charges alongside sales for a period.

**Acceptance Scenarios** (high level):

1. **Given** authorized owner/manager, **When** they record a shop charge with amount, category (e.g. team food), date, and optional note, **Then** it appears in the charges ledger with **recorded by [staff name]**.
2. **Given** charges and sales for a period, **When** the owner views a shop summary, **Then** they see total sales, total charges, and simple net indicator (sales minus charges, excluding workshop cost).
3. **Given** a charge recorded in error, **When** a manager voids it with reason, **Then** it is marked cancelled with audit trail (same discipline as sale voids).

---

### Edge Cases

- What happens when workshop sends more units than expected, or fewer than documented on the transfer slip?
- How does the system handle concurrent POS and online sales for the last unit in stock? **Resolved:** First completed checkout (POS sale or online order placement) wins; the second attempt is blocked with insufficient stock.
- Can a sale or order be voided or refunded, and how is stock restored? **Resolved:** Cashiers void **their own** POS sales **same calendar day** only; managers may void any sale or cancel any unfulfilled order. All voids/cancellations restore stock and persist **cancelled by [staff name]**, timestamp, and reason (optional).
- What if workshop product names or identifiers change after retail catalog sync?
- How are partial fulfillments handled for online orders (some items out of stock after order placed)? **Mitigation:** Stock is decremented at checkout; partial post-placement changes require staff cancellation/adjustment flows (see void/refund rules).
- What happens when a delivery address is outside the shop’s configured service city? **Resolved:** Checkout is blocked with a clear message; customer may switch to pickup or correct the address.
- What happens when a cashier session loses connectivity mid-sale (offline policy for v1)?
- **Phase 3 — credit:** What if a client’s credit limit is exceeded? Who approves pay-later sales — cashier or manager only?
- **Phase 3 — credit:** How are partial payments applied when a client owes multiple sales (oldest first vs manual allocation)?
- **Phase 3 — charges:** Are charges shop-scoped only, or can the network owner allocate central expenses across shops?

## Requirements *(mandatory)*

### Functional Requirements — MVP (Phase 1)

- **FR-001**: The system MUST support at least one retail shop with name, address, contact details, **delivery service area (city)**, and **flat delivery fee** editable by authorized managers.
- **FR-002**: The system MUST maintain a retail product catalog with sell price, display name, and a stable link to the corresponding workshop product identity (for reconciliation with galatk production).
- **FR-003**: The system MUST record inbound stock receipts per shop entered manually by authorized staff, increasing that shop’s sellable quantity and preserving an auditable transfer history (optional galatk reference, product, quantity, timestamp, actor). No automated pull or push from galatk at MVP.
- **FR-004**: The system MUST prevent selling more units than available in the target shop’s stock at the time of sale or online order placement (checkout); POS and online share one shop stock pool.
- **FR-005**: The system MUST provide a POS flow: search or select products, build a cart, apply quantity, complete payment, and persist a sale with line-level detail.
- **FR-006**: The system MUST decrement shop stock atomically when a POS sale completes or when an online customer successfully places an order at checkout.
- **FR-007**: The system MUST expose a public storefront per shop showing products available for online purchase with current availability status.
- **FR-008**: The system MUST allow customers to place online orders (guest checkout acceptable for v1) with cart, totals, order reference, and a required fulfillment choice: **pickup** or **delivery**. Delivery requires an address within the shop’s configured **same-city service area**; checkout MUST add the shop’s configured **flat delivery fee** to the order total when delivery is selected.
- **FR-009**: The system MUST support order fulfillment states at minimum: placed, ready for pickup, out for delivery, completed, and cancelled; pickup and delivery orders follow distinct status paths from the same placed state.
- **FR-010**: The system MUST authenticate shop staff and enforce role-based access (e.g., cashier vs shop manager vs network owner).
- **FR-011**: The system MUST scope stock, sales, and staff permissions to a shop; network-level views MUST aggregate without mixing inventory between shops.
- **FR-012**: The system MUST allow managers to view sales history and stock levels for their authorized shop(s).
- **FR-013**: The system MUST treat the galatk workshop as the upstream source of finished goods in business process only; retail MUST NOT connect to or modify workshop production data at MVP—staff may optionally record a galatk product or transfer reference on manual catalog entries and inbound receipts for reconciliation.
- **FR-014**: The system MUST support void of POS sales and cancellation of unfulfilled online orders with stock restored to the shop pool. **Cashiers** MAY void only **their own** POS sales on the **same calendar day**. **Managers** MAY void any POS sale or cancel any unfulfilled online order. Every void or cancellation MUST set status to cancelled, restore stock, and persist an audit record including **cancelled by [staff name]**, timestamp, and optional reason.
- **FR-015**: The system MUST be structured so additional shops can be added without duplicating deployments (same application instance, shop-scoped data).

### Functional Requirements — Phase 3 (client credit, reminders, charges; post-MVP)

*Detailed payment terms, credit limits, and reminder channels will be expanded in a follow-on specification. Requirements below set direction for planning and architecture.*

- **FR-016**: The system MUST support a **client catalog** per shop (or network) with contact identity and profile, linkable from POS sales (MVP guest sales remain valid without a client).
- **FR-017**: The system MUST support **credit sales**: record **partial payment** (e.g. 50% paid at sale) and **pay-later** (product released with outstanding balance), each tied to a client and auditable ledger entries.
- **FR-018**: The system MUST maintain a running **credit balance** per client (amount owed to the shop) with history of sales, payments, and adjustments; owners and managers MUST view balances and drill into underlying transactions.
- **FR-019**: The system MUST provide **credit reminders**: a view of clients with outstanding balances, amounts owed, and age of debt; support filtering/sorting for follow-up (in-app; SMS/email deferred unless specified later).
- **FR-020**: The system MUST support **shop charges** (operating expenses not tied to inventory): amount, category, date, optional note, shop scope, and **recorded by [staff name]**; charges MUST appear in owner/manager reporting separate from client credit and from product COGS.
- **FR-021**: Phase 3 features MUST enforce role rules: at minimum, **owners and managers** configure credit policy and record charge voids; **cashiers** may record sales against clients only if permitted by shop policy (exact rules TBD in follow-on spec).

### Key Entities

- **Shop**: A physical retail location; has identity, address, contact, **service city/area for delivery**, **flat delivery fee**, staff assignments, and isolated stock.
- **Retail Product**: Sellable item in the retail catalog; retail price, presentation fields, workshop product reference, online visibility flag.
- **Shop Stock**: Quantity of a retail product available at a specific shop (not shared across shops).
- **Inbound Transfer**: Receipt of goods from workshop to a shop; lines with product and quantity; status and actor.
- **Sale (POS)**: In-store transaction; shop, cashier, lines, payment method, totals, timestamp; status (completed or **cancelled** with **cancelled by**, cancelled-at, optional reason).
- **Online Order**: Customer purchase; shop, lines, customer contact, fulfillment type (**pickup** or **delivery**), delivery address when applicable, status (including **cancelled** with **cancelled by**, cancelled-at, optional reason), totals.
- **Staff User**: Person who operates POS or admin; role and shop scope.
- **Customer** (online / guest v1): Buyer identity for online orders; may be guest with contact info only — distinct from **Registered Client** below.

**Phase 3 entities (planned):**

- **Registered Client**: Known in-store customer in the client catalog; contact info, optional credit limit, link to shop/network.
- **Client Credit Ledger**: Running balance owed by client; composed of credit sale lines, partial payments, and payment receipts.
- **Credit Reminder**: Derived or explicit follow-up record for overdue balance (client, amount, age, contacted status).
- **Shop Charge**: Operating expense entry; category, amount, date, shop, recorded-by, optional void/cancel audit.

## Success Criteria *(mandatory)*

### Measurable Outcomes — MVP

- **SC-001**: A cashier can complete a typical 3-item POS sale in under 2 minutes after products are loaded in the register UI.
- **SC-002**: 100% of completed POS sales and online order confirmations reflect correct stock decrements with no negative shop stock in reports.
- **SC-003**: Shop managers can record an inbound transfer and see updated stock within one business action (no manual spreadsheet reconciliation required for daily ops).
- **SC-004**: Customers can browse the storefront and complete checkout in under 5 minutes on a standard mobile connection.
- **SC-005**: When a second shop is added, stock and sales for Shop 1 remain accurate with zero cross-shop inventory bleed in acceptance testing.
- **SC-006**: 95% of staff tasks (login, sell, view stock) succeed on first attempt without administrator intervention during pilot week.

### Measurable Outcomes — Phase 3 (targets for follow-on delivery)

- **SC-007**: Owner can identify all clients with outstanding credit and total owed in one dashboard view within 30 seconds.
- **SC-008**: 100% of credit sales and subsequent payments reconcile to the correct client balance with no unexplained drift in acceptance testing.
- **SC-009**: Shop charges recorded in a period appear in owner summary alongside sales so net cash picture is visible without external spreadsheets.

## Assumptions

- **Workshop boundary**: galatk remains the system of record for jobs, WIP, finishing, and central MAIN_STOCK; retail receives goods only via **manual** inbound receipts into shop stock (optional galatk reference for reconciliation). Automated catalog or transfer sync is deferred to a later integration feature.
- **Launch scope**: One shop is live at MVP; multi-shop is supported in the data model but full network owner UI can follow in a later increment.
- **Payments (v1)**: POS records cash and optionally “card” as payment type without integrated payment gateway; online orders use pay-on-pickup or cash-on-delivery unless a payment provider is added later.
- **Product identity**: Workshop products map 1:1 to retail catalog entries at launch (no size/color matrix unless added in a follow-on feature).
- **Tax and receipts**: Single currency; tax rules follow one jurisdiction default; printable or on-screen receipt is sufficient for v1.
- **Connectivity**: POS and storefront assume online connectivity for v1; offline POS is out of scope unless added explicitly later.
- **Repository layout (for planning phase only)**: Backend lives in `galatk-retail/backend` with feature modules under `src/modules/[feature_name]`; frontend lives in `galatk-retail/front-end` using Tailwind CSS for styling—these are engineering conventions for `/speckit.plan`, not business requirements for shop staff or customers.
- **Language**: Admin and POS UI in the operator’s working language; customer storefront language follows shop configuration (single language at MVP).
- **Void policy**: Cashier self-void limited to own POS sales same day; manager override for all voids and order cancellations; mandatory **cancelled by [staff name]** on every cancellation record.
- **Client credit (Phase 3)**: Applies primarily to **in-store / POS** trusted clients, not guest online checkout at MVP extension; partial pay and pay-later are owner-approved workflows; reminder delivery (SMS, WhatsApp, print) to be chosen in follow-on spec.
- **Shop charges (Phase 3)**: Charges are **operating expenses** (team food, petty cash, misc shop spend), not supplier inventory purchases and not worker payroll (payroll stays outside retail unless added later).
- **Planning hook**: Backend module layout SHOULD anticipate `clients`, `credit`, and `charges` (or equivalent) feature folders even if empty at MVP so Phase 3 does not require breaking changes to POS sale records.

## Dependencies

- **galatk workshop**: Operational handoff is manual at MVP—workshop staff reduce MAIN_STOCK in galatk separately; retail managers record matching inbound receipts (optional reference ID). Automated sync is a later integration spec.
- **Follow-on spec**: Phase 3 client credit, reminders, and shop charges need a dedicated increment (`002-client-credit-charges` or similar) before implementation — this document captures intent only.
