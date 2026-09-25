import type { OnlineOrder, Shop } from '@/types/api'
import { formatDzd } from '@/utils/formatMoney'
import { orderStatusLabel } from '@/services/orders'
import { printHtmlDocument } from '@/utils/printPosReceipt'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fulfillmentLabel(type: string): string {
  return type === 'PICKUP' ? 'Pickup' : 'Delivery'
}

/**
 * A4 commande receipt. Opens the browser print dialog so staff can
 * choose “Save as PDF” (Unicode-safe for Arabic / French names).
 */
export function saveOrderReceiptPdf(order: OnlineOrder, shop?: Pick<Shop, 'name' | 'address' | 'contactPhone'> | null) {
  const shopName = escapeHtml(shop?.name || 'Galatk')
  const shopMeta = [shop?.address, shop?.contactPhone].filter(Boolean).map((part) => escapeHtml(String(part))).join(' · ')
  const lines = order.lines
    .map((line) => {
      const variant = line.variantLabel ? `<div class="muted">${escapeHtml(line.variantLabel)}</div>` : ''
      return `<tr>
        <td>
          <strong>${escapeHtml(line.productName)}</strong>
          ${variant}
        </td>
        <td class="num">${line.quantity}</td>
        <td class="num">${escapeHtml(formatDzd(line.unitPrice))}</td>
        <td class="num">${escapeHtml(formatDzd(line.lineTotal))}</td>
      </tr>`
    })
    .join('')

  const deliveryRow =
    order.deliveryFee && Number(order.deliveryFee) > 0
      ? `<div class="row"><span>Delivery</span><span>${escapeHtml(formatDzd(order.deliveryFee))}</span></div>`
      : ''

  const address = order.deliveryAddress
    ? `<p>${escapeHtml(order.deliveryAddress)}${order.deliveryCity ? `, ${escapeHtml(order.deliveryCity)}` : ''}</p>`
    : ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${escapeHtml(order.orderNumber)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; color: #111; margin: 0; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 20px 0 8px; }
    .muted { color: #555; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 16px; margin-left: auto; width: 240px; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
    .total { font-weight: 700; border-top: 1px solid #111; padding-top: 8px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${shopName}</h1>
      ${shopMeta ? `<p class="muted">${shopMeta}</p>` : ''}
    </div>
    <div>
      <strong>${escapeHtml(order.orderNumber)}</strong>
      <p class="muted">${escapeHtml(new Date(order.createdAt).toLocaleString())}</p>
      <p class="muted">${escapeHtml(orderStatusLabel(order.status))} · ${escapeHtml(fulfillmentLabel(order.fulfillmentType))}</p>
    </div>
  </div>

  <h2>Customer</h2>
  <p><strong>${escapeHtml(order.customerName)}</strong><br>${escapeHtml(order.customerPhone)}</p>
  <p class="muted">${escapeHtml(order.customerWilaya || order.deliveryCity || '—')}</p>
  ${address}

  <h2>Products</h2>
  <table>
    <thead>
      <tr><th>Product</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>

  <div class="totals">
    ${order.subtotal ? `<div class="row"><span>Subtotal</span><span>${escapeHtml(formatDzd(order.subtotal))}</span></div>` : ''}
    ${deliveryRow}
    <div class="row total"><span>Total</span><span>${escapeHtml(formatDzd(order.total))}</span></div>
  </div>
</body>
</html>`

  printHtmlDocument(html)
}
