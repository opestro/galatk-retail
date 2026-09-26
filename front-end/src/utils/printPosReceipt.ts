import type { Sale } from '@/types/api'
import { numberLocale, translate } from '@/i18n/translate'

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
  return new Date(iso).toLocaleString(numberLocale())
}

function documentLangDir(): { lang: string; dir: string } {
  return {
    lang: document.documentElement.lang || 'en',
    dir: document.documentElement.dir || 'ltr',
  }
}

function paymentMethodLabel(method: string): string {
  const key = `common.paymentMethod.${method}`
  const label = translate(key)
  return label !== key ? label : method
}

function currency(): string {
  return translate('common.currency')
}

function receiptHtml(data: ReceiptData): string {
  const { lang, dir } = documentLangDir()
  const method = escapeHtml(paymentMethodLabel(data.paymentMethod))
  const dzd = escapeHtml(currency())

  if (data.type === 'payment') {
    return `<!DOCTYPE html><html lang="${escapeHtml(lang)}" dir="${escapeHtml(dir)}"><head><meta charset="utf-8"><title>${escapeHtml(translate('pos.receipt.paymentDocTitle'))}</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: ui-monospace, monospace; font-size: 12px; max-width: 280px; margin: 16px auto; color: #111; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; }
  .total { font-weight: bold; border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
</style></head><body>
<h1>${escapeHtml(translate('pos.receipt.paymentHeading'))}</h1>
<p class="muted">${escapeHtml(formatDate(data.createdAt))}</p>
<p><strong>${escapeHtml(data.clientName)}</strong><br>${escapeHtml(data.clientPhone)}</p>
<hr>
<div class="row"><span>${escapeHtml(translate('pos.receipt.amountPaid'))}</span><span>${escapeHtml(data.amount)} ${dzd}</span></div>
<div class="row"><span>${escapeHtml(translate('pos.receipt.method'))}</span><span>${method}</span></div>
<div class="row"><span>${escapeHtml(translate('pos.receipt.previousBalance'))}</span><span>${escapeHtml(data.previousBalance)} ${dzd}</span></div>
<div class="row total"><span>${escapeHtml(translate('pos.receipt.newBalance'))}</span><span>${escapeHtml(data.newBalance)} ${dzd}</span></div>
<p class="muted">${escapeHtml(translate('pos.receipt.paymentFooter', { id: data.paymentId.slice(0, 8), cashier: data.cashierName }))}</p>
</body></html>`
  }

  const lines = data.lines
    .map(
      (l) =>
        `<div class="row"><span>${escapeHtml(l.name)} × ${l.quantity}</span><span>${escapeHtml(String(l.lineTotal))} ${dzd}</span></div>`,
    )
    .join('')

  const clientBlock = data.clientName
    ? `<p><strong>${escapeHtml(translate('pos.receipt.clientLabel'))}</strong> ${escapeHtml(data.clientName)}${data.clientPhone ? ` · ${escapeHtml(data.clientPhone)}` : ''}</p>`
    : ''

  return `<!DOCTYPE html><html lang="${escapeHtml(lang)}" dir="${escapeHtml(dir)}"><head><meta charset="utf-8"><title>${escapeHtml(translate('pos.receipt.saleDocTitle'))}</title>
<style>
  @page { size: auto; margin: 8mm; }
  body { font-family: ui-monospace, monospace; font-size: 12px; max-width: 280px; margin: 16px auto; color: #111; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; gap: 8px; }
  .total { font-weight: bold; border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
</style></head><body>
<h1>${escapeHtml(translate('pos.receipt.saleHeading'))}</h1>
<p class="muted">${escapeHtml(formatDate(data.createdAt))}</p>
${clientBlock}
<hr>
${lines}
<div class="row total"><span>${escapeHtml(translate('pos.receipt.total'))}</span><span>${escapeHtml(String(data.total))} ${dzd}</span></div>
<div class="row"><span>${escapeHtml(translate('pos.receipt.paidNow'))}</span><span>${escapeHtml(String(data.amountPaid))} ${dzd}</span></div>
${Number(data.amountOnCredit) > 0 ? `<div class="row"><span>${escapeHtml(translate('pos.receipt.onCredit'))}</span><span>${escapeHtml(String(data.amountOnCredit))} ${dzd}</span></div>` : ''}
<div class="row"><span>${escapeHtml(translate('pos.receipt.method'))}</span><span>${method}</span></div>
<p class="muted">${escapeHtml(translate('pos.receipt.saleFooter', { id: data.saleId.slice(0, 8), cashier: data.cashierName }))}</p>
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
    throw new Error(translate('pos.receipt.printerError'))
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

export function saleToReceipt(sale: Sale, cashierFallback?: string): SaleReceiptData {
  return {
    type: 'sale',
    saleId: sale.id,
    createdAt: sale.createdAt,
    cashierName: sale.cashier?.name ?? cashierFallback ?? translate('common.staff'),
    paymentMethod: sale.paymentMethod,
    lines: (sale.lines ?? []).map((l) => ({
      name: l.product?.name ?? translate('pos.receipt.itemFallback'),
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
