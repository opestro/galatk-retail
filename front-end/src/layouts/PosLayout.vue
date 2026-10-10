<script setup lang="ts">
import { ref, computed, provide, nextTick, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { ShoppingCart, Package, Users, History, LogOut, Search, Wallet, Settings, Keyboard } from 'lucide-vue-next'
import ClientPaymentModal from '@/components/pos/ClientPaymentModal.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import ShopSelector from '@/components/admin/ShopSelector.vue'
import { usePosHotkeys } from '@/composables/usePosHotkeys'
import { isTouchDevice, shortcutLabel } from '@/utils/platform'
import type { Client } from '@/types/api'

interface RegisterApi {
  focusSearch: () => void
  completeSale: () => void
  clearCart: () => void
}

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const showPaymentModal = ref(false)
const paymentInitialClient = ref<Client | null>(null)
const userMenuOpen = ref(false)
const shortcutsOpen = ref(false)

const registerApi = ref<RegisterApi | null>(null)

const navItems = computed(() => [
  { to: '/pos', name: 'pos-register', label: t('pos.nav.register'), icon: ShoppingCart },
  { to: '/pos/orders', name: 'pos-orders', label: t('pos.nav.orders'), icon: Package },
  { to: '/pos/credits', name: 'pos-credits', label: t('pos.nav.credits'), icon: Users },
  { to: '/pos/history', name: 'pos-history', label: t('pos.nav.history'), icon: History },
])

const hotkeys = computed(() => [
  { keys: shortcutLabel('F2', '⌥2'), label: t('pos.shortcuts.searchProducts') },
  { keys: shortcutLabel('F4', '⌥4'), label: t('pos.shortcuts.recordPayment') },
  { keys: shortcutLabel('F12', '⌘↵'), label: t('pos.shortcuts.completeSale') },
  { keys: 'Esc', label: t('pos.shortcuts.clearCart') },
  { keys: '↑ ↓ ↵', label: t('pos.shortcuts.browse') },
])

const isRegister = computed(() => route.name === 'pos-register')

const staffName = computed(() => auth.staff?.name ?? t('common.staff'))
const initials = computed(() =>
  staffName.value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

function handleLogout() {
  userMenuOpen.value = false
  auth.logout()
}

function openPaymentModal(client?: Client | null) {
  paymentInitialClient.value = client ?? null
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
  paymentInitialClient.value = null
}

/** From any POS page, search jumps to the register and focuses its field once it mounts. */
let focusSearchOnMount = false

function focusSearch() {
  if (isRegister.value && registerApi.value) {
    registerApi.value.focusSearch()
    return
  }
  focusSearchOnMount = true
  void router.push({ name: 'pos-register' })
}

watch(
  registerApi,
  (api) => {
    if (!api || !focusSearchOnMount) return
    focusSearchOnMount = false
    void nextTick(() => api.focusSearch())
  },
  { flush: 'post' },
)

usePosHotkeys({
  onFocusSearch: focusSearch,
  onRecordPayment: () => {
    if (!showPaymentModal.value) openPaymentModal()
  },
  onCompleteSale: () => {
    if (isRegister.value) registerApi.value?.completeSale()
  },
  onClearCart: () => {
    if (isRegister.value) registerApi.value?.clearCart()
  },
})

provide('posOpenPayment', () => openPaymentModal())
provide('posOpenPaymentForClient', (client: Client) => openPaymentModal(client))
provide('posRegisterApi', registerApi)
</script>

<template>
  <div class="pos flex h-dvh flex-col">
    <!-- Unified top bar -->
    <header
      class="relative z-30 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2.5 bg-white px-3 py-2.5 sm:gap-x-3 sm:px-5 md:h-16 md:flex-nowrap md:py-0"
      style="box-shadow: 0 1px 0 var(--color-pos-line) !important"
    >
      <!-- Brand -->
      <RouterLink to="/pos" class="hidden shrink-0 items-center gap-2.5 rounded-lg sm:flex" :aria-label="$t('pos.brand')">
        <span class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-pos-espresso text-[14px] font-semibold text-white">G</span>
        <span class="hidden text-[15px] font-semibold tracking-[-0.01em] text-pos-ink xl:inline">{{ $t('pos.brand') }}</span>
      </RouterLink>

      <!-- Navigation pills -->
      <nav class="pos-nav shrink-0" :aria-label="$t('pos.nav.label')">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="pos-nav-pill"
          :aria-current="route.name === item.name ? 'page' : undefined"
          :title="item.label"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span class="hidden xl:inline">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Search: the register teleports its live field here -->
      <div class="order-last w-full md:order-none md:mx-2 md:w-auto md:max-w-md md:flex-1">
        <div v-show="isRegister" id="pos-header-search" class="w-full" />
        <button
          v-if="!isRegister"
          type="button"
          class="relative flex h-10 w-full items-center gap-2.5 rounded-xl bg-pos-canvas ps-3.5 pe-3 text-start text-[14px] text-pos-faint transition-colors hover:bg-[#eceef1]"
          @click="focusSearch"
        >
          <Search class="h-4 w-4" aria-hidden="true" />
          <span class="flex-1 truncate">{{ $t('pos.header.searchPlaceholder') }}</span>
          <kbd v-if="!isTouchDevice" class="pos-kbd bg-white">{{ shortcutLabel('F2', '⌥2') }}</kbd>
        </button>
      </div>

      <!-- Actions -->
      <div class="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          class="pos-btn-soft h-10 min-h-10 px-3"
          :aria-label="$t('pos.quickActions.recordPayment')"
          :title="$t('pos.quickActions.recordPayment')"
          @click="openPaymentModal()"
        >
          <Wallet class="h-4 w-4" />
          <span class="hidden lg:inline">{{ $t('pos.quickActions.recordPayment') }}</span>
          <kbd v-if="!isTouchDevice" class="pos-kbd hidden lg:inline-flex">{{ shortcutLabel('F4', '⌥4') }}</kbd>
        </button>

        <!-- Shortcuts reference -->
        <div v-if="!isTouchDevice" class="relative hidden md:block">
          <button
            type="button"
            class="pos-icon-btn"
            :class="shortcutsOpen ? 'bg-black/5 text-pos-ink' : ''"
            :aria-label="$t('pos.header.shortcuts')"
            :aria-expanded="shortcutsOpen"
            @click="shortcutsOpen = !shortcutsOpen"
          >
            <Keyboard class="h-[18px] w-[18px]" />
          </button>
          <div v-if="shortcutsOpen" class="fixed inset-0 z-40" @click="shortcutsOpen = false" />
          <Transition name="pos-pop">
            <div v-if="shortcutsOpen" class="pos-menu end-0 top-full mt-2 w-72 p-3" @keydown.esc.stop="shortcutsOpen = false">
              <p class="px-1 pb-2 text-[12px] font-medium text-pos-muted">{{ $t('pos.shortcuts.title') }}</p>
              <ul class="flex flex-col">
                <li v-for="hk in hotkeys" :key="hk.label" class="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-[13px] text-pos-ink-2">
                  <span>{{ hk.label }}</span>
                  <kbd class="pos-kbd">{{ hk.keys }}</kbd>
                </li>
              </ul>
            </div>
          </Transition>
        </div>

        <ShopSelector compact />
        <LanguageSwitcher variant="segmented" />

        <!-- Account -->
        <div class="relative">
          <button
            type="button"
            class="flex h-10 items-center gap-2 rounded-xl ps-1 pe-1 transition-colors hover:bg-black/[0.04] xl:pe-3"
            :aria-label="$t('pos.header.account')"
            :aria-expanded="userMenuOpen"
            aria-haspopup="menu"
            @click="userMenuOpen = !userMenuOpen"
          >
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-pos-canvas text-[12px] font-semibold text-pos-ink">{{ initials }}</span>
            <span class="hidden max-w-[9rem] truncate text-[13px] font-medium text-pos-ink xl:inline">{{ staffName }}</span>
          </button>
          <div v-if="userMenuOpen" class="fixed inset-0 z-40" @click="userMenuOpen = false" />
          <Transition name="pos-pop">
            <div v-if="userMenuOpen" class="pos-menu end-0 top-full mt-2 w-56" role="menu" @keydown.esc.stop="userMenuOpen = false">
              <div class="px-3 pt-2 pb-2.5">
                <p class="truncate text-[13px] font-medium text-pos-ink">{{ staffName }}</p>
                <p class="truncate text-[12px] text-pos-muted">{{ auth.staff?.email }}</p>
              </div>
              <div class="my-1 h-px bg-pos-line" />
              <RouterLink
                v-if="auth.isManager"
                to="/admin"
                class="pos-menu-item"
                role="menuitem"
                @click="userMenuOpen = false"
              >
                <Settings class="h-4 w-4 text-pos-muted" />
                {{ $t('pos.userMenu.adminPanel') }}
              </RouterLink>
              <button type="button" class="pos-menu-item" role="menuitem" @click="handleLogout">
                <LogOut class="h-4 w-4 text-pos-muted rtl:rotate-180" />
                {{ $t('pos.userMenu.logout') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- Main area: full-bleed on register, padded scroll elsewhere -->
    <main
      :class="isRegister ? 'overflow-hidden' : 'overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8'"
      class="flex min-h-0 flex-1"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="pos-page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <ClientPaymentModal
      v-if="showPaymentModal"
      :initial-client="paymentInitialClient"
      @close="closePaymentModal"
    />
  </div>
</template>
