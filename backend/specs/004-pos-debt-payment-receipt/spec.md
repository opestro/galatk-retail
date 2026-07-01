# Feature: POS Debt Payment, Success Feedback & Receipts

**Branch**: `004-pos-debt-payment-receipt`

## What

Cashiers search clients with outstanding credit, record payments to reduce balance, hear a success sound, see a confirmation popup, and print a receipt. Same success + print flow after completing a POS sale.

## Why

Debt collection at the register must be fast, auditable, and give immediate feedback like commercial POS systems.

## Acceptance Criteria

- Payment modal searches **debtors only** (balance > 0) by name/phone.
- Cashier can **pay full balance** in one tap; amount cannot exceed balance.
- Credits page has **Collect payment** per client opening the payment modal pre-filled.
- After payment or sale: **success sound** + **popup** with summary.
- Popup offers **Print receipt** (browser print dialog, thermal-friendly layout).

## Out of Scope

- Bluetooth/hardware receipt printer drivers.
- Email/SMS receipts.

## Assumptions

- Receipt uses `window.print()` on a hidden printable HTML template.
