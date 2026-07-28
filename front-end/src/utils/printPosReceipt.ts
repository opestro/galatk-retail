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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function receiptHtml(data: ReceiptData): string {
  if (data.type === 'payment') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment receipt</title>
<style>
  body { font-family: ui-monospace, monospace; font-size: 12px; max-width: 280px; margin: 16px auto; color: #111; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; }
  .total { font-weight: bold; border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
</style></head><body>
<h1>CLIENT PAYMENT</h1>
<p class="muted">${formatDate(data.createdAt)}</p>
<p><strong>${data.clientName}</strong><br>${data.clientPhone}</p>
<hr>
<div class="row"><span>Amount paid</span><span>${data.amount} DZD</span></div>
<div class="row"><span>Method</span><span>${data.paymentMethod}</span></div>
<div class="row"><span>Previous balance</span><span>${data.previousBalance} DZD</span></div>
<div class="row total"><span>New balance</span><span>${data.newBalance} DZD</span></div>
<p class="muted">Receipt #${data.paymentId.slice(0, 8)} · ${data.cashierName}</p>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body></html>`
  }

  const lines = data.lines
    .map(
      (l) =>
        `<div class="row"><span>${l.name} × ${l.quantity}</span><span>${l.lineTotal} DZD</span></div>`,
    )
    .join('')

  const clientBlock = data.clientName
    ? `<p><strong>Client:</strong> ${data.clientName}${data.clientPhone ? ` · ${data.clientPhone}` : ''}</p>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sale receipt</title>
<style>
  body { font-family: ui-monospace, monospace; font-size: 12px; max-width: 280px; margin: 16px auto; color: #111; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; gap: 8px; }
  .total { font-weight: bold; border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
</style></head><body>
<h1>SALE RECEIPT</h1>
<p class="muted">${formatDate(data.createdAt)}</p>
${clientBlock}
<hr>
${lines}
<div class="row total"><span>Total</span><span>${data.total} DZD</span></div>
<div class="row"><span>Paid now</span><span>${data.amountPaid} DZD</span></div>
${Number(data.amountOnCredit) > 0 ? `<div class="row"><span>On credit</span><span>${data.amountOnCredit} DZD</span></div>` : ''}
<div class="row"><span>Method</span><span>${data.paymentMethod}</span></div>
<p class="muted">Sale #${data.saleId.slice(0, 8)} · ${data.cashierName}</p>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body></html>`
}

export function printPosReceipt(data: ReceiptData) {
  const html = receiptHtml(data)
  const printWindow = window.open('', '_blank', 'width=360,height=640')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
}
