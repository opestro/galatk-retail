<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  ShoppingCart,
  Package,
  Users,
  History,
  ChevronDown,
  LogOut,
  Search,
  Wallet,
  CheckCircle2,
  Settings,
} from 'lucide-vue-next'
import ClientPaymentModal from '@/components/pos/ClientPaymentModal.vue'

interface RegisterApi {
  focusSearch: () => void
  completeSale: () => void
}

const auth = useAuthStore()
const route = useRoute()
const showPaymentModal = ref(false)
const userMenuOpen = ref(false)

const registerApi = ref<RegisterApi | null>(null)

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

const navItems = [
  { to: '/pos', name: 'Register', icon: ShoppingCart },
  { to: '/pos/orders', name: 'Orders', icon: Package },
  { to: '/pos/credits', name: 'Credits', icon: Users },
  { to: '/pos/history', name: 'History', icon: History },
]

interface QuickAction {
  id: 'search' | 'payment' | 'sale'
  label: string
  icon: typeof Wallet
  primary: boolean
  mac: string
  win: string
}

const quickActions: QuickAction[] = [
  { id: 'search', label: 'Search', icon: Search, primary: false, mac: '⌥2', win: 'F2' },
  { id: 'payment', label: 'Record payment', icon: Wallet, primary: false, mac: '⌥4', win: 'F4' },
  { id: 'sale', label: 'Complete sale', icon: CheckCircle2, primary: true, mac: '⌘↵', win: 'F12' },
]

const hotkeys = [
  { mac: '⌥2', win: 'F2', label: 'Search products' },
  { mac: '⌥4', win: 'F4', label: 'Record payment' },
  { mac: '⌘↵', win: 'F12', label: 'Complete sale' },
  { mac: 'Esc', win: 'Esc', label: 'Clear cart' },
]

const isRegister = computed(() => route.name === 'pos-register')

const visibleQuickActions = computed(() =>
  quickActions.filter((a) => (a.id === 'payment' ? true : isRegister.value)),
)

function handleLogout() {
  userMenuOpen.value = false
  auth.logout()
}

function openPaymentModal() {
  showPaymentModal.value = true
}

// Quick action bar — buttons call handlers directly (no synthetic KeyboardEvent).
function triggerQuick(id: QuickAction['id']) {
  if (id === 'payment') {
    openPaymentModal()
  } else if (id === 'search') {
    registerApi.value?.focusSearch()
  } else if (id === 'sale') {
    registerApi.value?.completeSale()
  }
}

provide('posOpenPayment', openPaymentModal)
provide('posRegisterApi', registerApi)
</script>

<template>
  <div class="flex h-screen flex-col bg-gray-50 text-gray-900">
    <!-- Top bar: icon-card nav (left) + quick actions + user menu (right) -->
    <header class="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
      <nav class="flex items-center gap-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg border border-gray-200 px-1 py-2 text-center text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          active-class="!bg-gray-900 !text-white !border-gray-900"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span class="truncate">{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <button
          v-for="action in visibleQuickActions"
          :key="action.id"
          type="button"
          :class="[
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            action.primary
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50',
          ]"
          @click="triggerQuick(action.id)"
        >
          <component :is="action.icon" class="h-4 w-4" />
          <span class="hidden sm:inline">{{ action.label }}</span>
          <kbd
            class="hidden rounded bg-black/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums sm:inline"
            :class="action.primary ? 'bg-white/15 text-white/80' : 'text-gray-500'"
          >
            {{ isMac ? action.mac : action.win }}
          </kbd>
        </button>

        <!-- User menu -->
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="userMenuOpen = !userMenuOpen"
          >
            <span class="max-w-[10rem] truncate">{{ auth.staff?.name ?? 'Staff' }}</span>
            <ChevronDown class="h-4 w-4" />
          </button>
          <div
            v-if="userMenuOpen"
            class="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1"
            @click.stop
          >
            <RouterLink
              v-if="auth.isManager"
              to="/admin"
              class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              @click="userMenuOpen = false"
            >
              <Settings class="h-4 w-4" />
              Admin panel
            </RouterLink>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
              Logout
            </button>
          </div>
          <button
            v-if="userMenuOpen"
            type="button"
            class="fixed inset-0 -z-10 cursor-default"
            tabindex="-1"
            @click="userMenuOpen = false"
          />
        </div>
      </div>
    </header>

    <!-- Shortcut legend (register only) -->
    <div
      v-if="isRegister"
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-1.5 text-xs text-gray-500"
    >
      <span class="font-medium text-gray-600">Shortcuts</span>
      <span
        v-for="hk in hotkeys"
        :key="hk.label"
        class="flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5"
      >
        <kbd class="font-mono text-gray-800">{{ isMac ? hk.mac : hk.win }}</kbd>
        <span class="text-gray-500">{{ hk.label }}</span>
      </span>
    </div>

    <!-- Main area: full-bleed on register, padded scroll elsewhere -->
    <main
      :class="isRegister ? 'overflow-hidden p-0' : 'overflow-auto p-4 md:p-6'"
      class="flex min-h-0 flex-1"
    >
      <RouterView />
    </main>

    <ClientPaymentModal
      v-if="showPaymentModal"
      @close="showPaymentModal = false"
      @recorded="showPaymentModal = false"
    />
  </div>
</template>
