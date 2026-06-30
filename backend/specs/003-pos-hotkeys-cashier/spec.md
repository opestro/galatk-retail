# Feature Specification: POS UX, Cashier Orders & Online Client Sync

**Branch**: `003-pos-hotkeys-cashier`  
**Created**: 2026-06-23

## What

Upgrade POS UX with keyboard shortcuts and a cashier-friendly layout; let cashiers view client debt/credit and manage online orders; auto-register online shoppers as clients; require payment recovery (full / partial / pay later) when completing online orders.

## Why

Cashiers need one screen to sell, collect debt, and hand off online orders without switching to admin. Online buyers should appear in the client register for in-store follow-up and credit tracking.

## Acceptance Criteria

- Cashier can open **POS → Credits** and see clients with outstanding balance (read-only list).
- Cashier can open **POS → Online orders**, mark ready, and **complete** with payment mode: full pay, partial pay, or pay later (manager for pay-later / limit override).
- Online checkout **creates or links a Client** by phone; client appears in POS client search.
- Completing an online order records `amountPaid` / credit on client ledger (no double stock decrement).
- POS register supports **hotkeys**: focus search (F2), record payment (F4), complete sale (F12), clear cart (Esc).
- POS layout uses sidebar navigation with visible shortcut hints.

## Out of Scope

- Online pay-later at checkout (still pay on pickup/delivery only).
- SMS/email reminders.
- Redesigning admin area beyond order completion modal.

## Assumptions

- Existing phone uniqueness rules apply; online auto-register creates client at ordering shop if phone is new.
- If phone exists on another shop’s client, link to that existing client record.
