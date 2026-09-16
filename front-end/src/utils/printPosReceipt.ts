import type { Sale } from '@/types/api'

export interface SaleReceiptData {
  type: 'sale'
  saleId: string
  createdAt: string
  cashierName: string
  paymentMethod: string
  lines: Array<{ name: string; quantity: number; lineTotal: string }>
  subtotal: string
  total: string
  amountPaid: string
  amountOnCredit: string
  clientName?: string | null
  clientPhone?: string | null
}

export interface PaymentReceiptData {
  type: 'payment'
  paymentId: string
  createdAt: string
  cashierName: string
  paymentMethod: string
  clientName: string
  clientPhone: string
  amount: string
  previousBalance: string
  newBalance: string
}

export type ReceiptData = SaleReceiptData | PaymentReceiptData

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function receiptHtml(data: ReceiptData): string {
  if (data.type === 'payment') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment receipt</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: ui-monospace, monospace; font-size: 12px; max-width: 280px; margin: 16px auto; color: #111; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; }
  .total { font-weight: bold; border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
</style></head><body>
<h1>CLIENT PAYMENT</h1>
<p class="muted">${escapeHtml(formatDate(data.createdAt))}</p>
<p><strong>${escapeHtml(data.clientName)}</strong><br>${escapeHtml(data.clientPhone)}</p>
<hr>
<div class="row"><span>Amount paid</span><span>${escapeHtml(data.amount)} DZD</span></div>
<div class="row"><span>Method</span><span>${escapeHtml(data.paymentMethod)}</span></div>
<div class="row"><span>Previous balance</span><span>${escapeHtml(data.previousBalance)} DZD</span></div>
<div class="row total"><span>New balance</span><span>${escapeHtml(data.newBalance)} DZD</span></div>
<p class="muted">Receipt #${escapeHtml(data.paymentId.slice(0, 8))} · ${escapeHtml(data.cashierName)}</p>
</body></html>`
  }

  const lines = data.lines
    .map(
      (l) =>
        `<div class="row"><span>${escapeHtml(l.name)} × ${l.quantity}</span><span>${escapeHtml(String(l.lineTotal))} DZD</span></div>`,
    )
    .join('')

  const clientBlock = data.clientName
    ? `<p><strong>Client:</strong> ${escapeHtml(data.clientName)}${data.clientPhone ? ` · ${escapeHtml(data.clientPhone)}` : ''}</p>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sale receipt</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: ui-monospace, monospace; font-size: 12px; max-width: 280px; margin: 16px auto; color: #111; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; gap: 8px; }
  .total { font-weight: bold; border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
</style></head><body>
<h1>SALE RECEIPT</h1>
<p class="muted">${escapeHtml(formatDate(data.createdAt))}</p>
${clientBlock}
<hr>
${lines}
<div class="row total"><span>Total</span><span>${escapeHtml(String(data.total))} DZD</span></div>
<div class="row"><span>Paid now</span><span>${escapeHtml(String(data.amountPaid))} DZD</span></div>
${Number(data.amountOnCredit) > 0 ? `<div class="row"><span>On credit</span><span>${escapeHtml(String(data.amountOnCredit))} DZD</span></div>` : ''}
<div class="row"><span>Method</span><span>${escapeHtml(data.paymentMethod)}</span></div>
<p class="muted">Sale #${escapeHtml(data.saleId.slice(0, 8))} · ${escapeHtml(data.cashierName)}</p>
</body></html>`
}

/**
 * Opens the system print dialog from a hidden iframe so cashiers can
 * print a thermal receipt without a popup being blocked.
 */
export function printHtmlDocument(html: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '360px'
  iframe.style.height = '640px'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    throw new Error('Could not open the receipt printer.')
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 0)
  }
  win.addEventListener('afterprint', cleanup)

  window.setTimeout(() => {
    win.focus()
    win.print()
  }, 50)
}

export function saleToReceipt(sale: Sale, cashierFallback = 'Staff'): SaleReceiptData {
  return {
    type: 'sale',
    saleId: sale.id,
    createdAt: sale.createdAt,
    cashierName: sale.cashier?.name ?? cashierFallback,
    paymentMethod: sale.paymentMethod,
    lines: (sale.lines ?? []).map((l) => ({
      name: l.product?.name ?? 'Item',
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
    subtotal: sale.total,
    total: sale.total,
    amountPaid: sale.amountPaid ?? sale.total,
    amountOnCredit: sale.amountOnCredit ?? '0',
    clientName: sale.client?.name ?? null,
    clientPhone: sale.client?.phone ?? null,
  }
}

export function printPosReceipt(data: ReceiptData) {
  printHtmlDocument(receiptHtml(data))
}
