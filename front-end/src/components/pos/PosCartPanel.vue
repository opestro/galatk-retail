<script setup lang="ts">
import { computed, ref } from 'vue'
import { Banknote, CreditCard, Minus, Plus, ShoppingBag, Trash2, X, AlertCircle, Info, Shirt } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { usePosCartStore, type CheckoutMode } from '@/stores/posCart'
import { mediaUrl } from '@/services/products'
import { formatAmount, formatCount, formatMoney } from '@/utils/formatMoney'
import { isTouchDevice, shortcutLabel } from '@/utils/platform'
import ClientPicker from '@/components/pos/ClientPicker.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import type { Client } from '@/types/api'

/**
 * The checkout panel: line items, client, payment options and a sticky total.
 * Rendered as the desktop side panel and inside the phone/tablet bottom sheet.
 */
const props = defineProps<{
  /** `sheet` adds a close button for the mobile drawer. */
  mode: 'panel' | 'sheet'
  /** Cmd/F12 pressed with no client: ask to confirm walk-in or pick one. */
  confirmStage: boolean
  error: string
  busy?: boolean
}>()

const paymentMethod = defineModel<'CASH' | 'CARD'>('paymentMethod', { required: true })

const emit = defineEmits<{
  completeSale: []
  clientConfirm: [client: Client | null]
  clear: []
  close: []
}>()

const auth = useAuthStore()
const cart = usePosCartStore()
const clientPickerRef = ref<InstanceType<typeof ClientPicker> | null>(null)

const awaitingClient = computed(() => props.confirmStage && !cart.selectedClient)

const checkoutModes = computed<Array<{ id: CheckoutMode; label: string }>>(() => [
  { id: 'full', label: 'pos.checkout.full' },
  { id: 'partial', label: 'pos.checkout.partial' },
  ...(auth.isManager ? [{ id: 'payLater' as const, label: 'pos.checkout.later' }] : []),
])

const methods = [
  { id: 'CASH' as const, icon: Banknote },
  { id: 'CARD' as const, icon: CreditCard },
]

function setMode(mode: CheckoutMode) {
  if (mode === 'payLater' && !auth.isManager) return
  cart.setCheckoutMode(mode)
}

function increment(productId: string, quantity: number) {
  cart.updateQuantity(productId, quantity + 1)
}

function decrement(productId: string, quantity: number) {
  if (quantity <= 1) cart.removeLine(productId)
  else cart.updateQuantity(productId, quantity - 1)
}

defineExpose({ focusClient: () => clientPickerRef.value?.focus() })
</script>

<template>
  <section class="flex h-full min-h-0 flex-col" :aria-label="$t('pos.register.currentSale')">
    <!-- Header -->
    <header class="flex shrink-0 items-center gap-2 px-5 pt-5 pb-3">
      <h2 class="text-[16px] font-semibold tracking-[-0.01em] text-pos-ink">{{ $t('pos.register.currentSale') }}</h2>
      <span v-if="cart.itemCount" class="pos-badge-neutral pos-num">{{ $t('pos.register.items', { n: formatCount(cart.itemCount) }, cart.itemCount) }}</span>
      <div class="ms-auto flex items-center gap-1">
        <button
          v-if="cart.lines.length"
          type="button"
          class="pos-btn-ghost pos-btn-sm text-pos-muted"
          @click="emit('clear')"
        >
          <Trash2 class="h-3.5 w-3.5" />
          {{ $t('pos.register.clearCart') }}
          <kbd v-if="!isTouchDevice && mode === 'panel'" class="pos-kbd">Esc</kbd>
        </button>
        <button v-if="mode === 'sheet'" type="button" class="pos-icon-btn" :aria-label="$t('common.close')" @click="emit('close')">
          <X class="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-5">
      <!-- Lines -->
      <TransitionGroup v-if="cart.lines.length" tag="ul" name="pos-list" class="relative flex flex-col" :aria-label="$t('pos.register.cartTitle')">
        <li
          v-for="line in cart.lines"
          :key="line.productId"
          class="flex gap-3 border-b border-pos-line/70 py-3.5 last:border-b-0"
        >
          <span class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pos-sunken">
            <img v-if="line.imageUrl" :src="mediaUrl(line.imageUrl)" alt="" class="h-full w-full object-cover" />
            <Shirt v-else class="h-4 w-4 text-pos-faint" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="min-w-0 truncate text-[14px] font-medium text-pos-ink">{{ line.name }}</p>
              <button
                type="button"
                class="-me-1.5 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-pos-faint transition-colors hover:bg-pos-err-bg hover:text-pos-err"
                :aria-label="$t('pos.register.removeItem', { name: line.name })"
                @click="cart.removeLine(line.productId)"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="text-[12px] text-pos-muted pos-num">{{ $t('pos.register.each', { price: formatMoney(line.sellPrice) }) }}</p>
            <div class="mt-2 flex items-center justify-between gap-2">
              <div class="inline-flex items-center rounded-[10px] bg-pos-canvas p-0.5">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-pos-ink-2 transition-colors hover:bg-white"
                  :aria-label="$t('pos.register.decrease', { name: line.name })"
                  @click="decrement(line.productId, line.quantity)"
                >
                  <Minus class="h-3.5 w-3.5" />
                </button>
                <span :key="line.quantity" class="pos-bump min-w-7 text-center text-[13px] font-semibold text-pos-ink pos-num" aria-live="polite">
                  {{ formatCount(line.quantity) }}
                </span>
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-pos-ink-2 transition-colors hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                  :disabled="line.stock !== undefined && line.quantity >= line.stock"
                  :aria-label="$t('pos.register.increase', { name: line.name })"
                  @click="increment(line.productId, line.quantity)"
                >
                  <Plus class="h-3.5 w-3.5" />
                </button>
              </div>
              <span class="text-[14px] font-semibold text-pos-ink pos-num">{{ formatMoney(Number(line.sellPrice) * line.quantity) }}</span>
            </div>
          </div>
        </li>
      </TransitionGroup>

      <PosEmptyState
        v-else
        :icon="ShoppingBag"
        :title="$t('pos.register.emptyCartTitle')"
        :body="$t('pos.register.emptyCartBody')"
        compact
      />

      <!-- Client & payment -->
      <div class="flex flex-col gap-5 border-t border-pos-line py-5">
        <div
          class="rounded-2xl transition-[box-shadow,padding] duration-200"
          :class="awaitingClient ? 'p-3 outline-2 outline-pos-ink' : ''"
        >
          <ClientPicker
            ref="clientPickerRef"
            :model-value="cart.selectedClient"
            @update:model-value="cart.selectClient"
            @confirm="emit('clientConfirm', $event)"
          />
          <template v-if="awaitingClient">
            <p class="mt-2.5 text-[12.5px] text-pos-muted">
              {{ mode === 'panel' ? $t('pos.register.confirmWalkInHintDesktop') : $t('pos.register.confirmWalkInHintMobile') }}
            </p>
            <button type="button" class="pos-btn-soft pos-btn-sm mt-2.5 w-full" @click="emit('clientConfirm', null)">
              {{ $t('pos.register.confirmWalkIn') }}
            </button>
          </template>
        </div>

        <div v-if="cart.selectedClient" class="flex flex-col gap-2">
          <span class="pos-label">{{ $t('pos.register.paymentType') }}</span>
          <div class="pos-segmented" role="group" :aria-label="$t('pos.register.paymentType')">
            <button
              v-for="option in checkoutModes"
              :key="option.id"
              type="button"
              class="pos-segment"
              :aria-pressed="cart.checkoutMode === option.id"
              @click="setMode(option.id)"
            >
              {{ $t(option.label) }}
            </button>
          </div>
        </div>

        <div v-if="cart.selectedClient && cart.checkoutMode === 'partial'" class="flex flex-col gap-2">
          <label for="pos-paid-now" class="pos-label">{{ $t('pos.register.paidNow') }}</label>
          <div class="relative">
            <input
              id="pos-paid-now"
              v-model.number="cart.amountPaid"
              type="number"
              inputmode="decimal"
              min="0"
              :max="cart.total"
              step="0.01"
              class="pos-input pe-14 text-[16px] font-semibold pos-num"
            />
            <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[13px] text-pos-muted">{{ $t('common.currency') }}</span>
          </div>
        </div>

        <p v-if="cart.selectedClient && cart.amountOnCredit > 0" class="pos-notice bg-pos-warn-bg text-pos-warn">
          <Info class="mt-px h-4 w-4 shrink-0" />
          <span>{{ $t('pos.register.creditAmount', { amount: formatMoney(cart.amountOnCredit) }) }}</span>
        </p>

        <div class="flex flex-col gap-2">
          <span class="pos-label">{{ $t('pos.register.paymentMethod') }}</span>
          <div class="pos-segmented" role="group" :aria-label="$t('pos.register.paymentMethod')">
            <button
              v-for="method in methods"
              :key="method.id"
              type="button"
              class="pos-segment min-h-10"
              :aria-pressed="paymentMethod === method.id"
              @click="paymentMethod = method.id"
            >
              <component :is="method.icon" class="h-4 w-4" />
              {{ $t(`common.paymentMethod.${method.id}`) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sticky total + checkout -->
    <footer
      class="shrink-0 border-t border-pos-line bg-white px-5 pt-4"
      style="padding-bottom: max(1.25rem, env(safe-area-inset-bottom))"
    >
      <p v-if="error" class="pos-notice mb-3 bg-pos-err-bg text-pos-err" role="alert">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        <span>{{ error }}</span>
      </p>

      <dl class="flex flex-col gap-1.5 text-[13px]">
        <div class="flex items-center justify-between text-pos-muted">
          <dt>{{ $t('pos.register.subtotal') }}</dt>
          <dd class="pos-num">{{ formatMoney(cart.total) }}</dd>
        </div>
        <div v-if="cart.selectedClient && cart.amountOnCredit > 0" class="flex items-center justify-between text-pos-warn">
          <dt>{{ $t('pos.register.onCredit') }}</dt>
          <dd class="pos-num">{{ formatMoney(cart.amountOnCredit) }}</dd>
        </div>
        <div class="mt-1 flex items-baseline justify-between gap-3">
          <dt class="text-[14px] font-medium text-pos-ink">{{ $t('pos.register.total') }}</dt>
          <dd class="flex items-baseline gap-1.5 text-pos-ink">
            <span class="text-[28px] leading-none font-semibold tracking-[-0.02em] pos-num">{{ formatAmount(cart.total) }}</span>
            <span class="text-[13px] font-medium text-pos-muted">{{ $t('common.currency') }}</span>
          </dd>
        </div>
      </dl>

      <button
        type="button"
        :disabled="!cart.lines.length || busy"
        class="pos-btn-primary mt-4 h-14 w-full rounded-2xl text-[15px]"
        @click="emit('completeSale')"
      >
        <span v-if="busy" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
        {{ $t('pos.register.completeSale') }}
        <kbd v-if="!isTouchDevice" class="pos-kbd pos-kbd-dark ms-1">{{ shortcutLabel('F12', '⌘↵') }}</kbd>
      </button>
    </footer>
  </section>
</template>
