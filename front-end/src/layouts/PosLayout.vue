<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  ShoppingCart,
  History,
  LogOut,
  Wallet,
  Package,
  Users,
  LayoutGrid,
} from 'lucide-vue-next'
import ClientPaymentModal from '@/components/pos/ClientPaymentModal.vue'

const auth = useAuthStore()
const route = useRoute()
const showPaymentModal = ref(false)

const navItems = [
  { to: '/pos', name: 'Register', icon: ShoppingCart, shortcut: 'Home' },
  { to: '/pos/orders', name: 'Online orders', icon: Package, shortcut: '' },
  { to: '/pos/credits', name: 'Credits & debt', icon: Users, shortcut: '' },
  { to: '/pos/history', name: 'Sales history', icon: History, shortcut: '' },
]

const hotkeys = [
  { key: 'F2', label: 'Search products' },
  { key: 'F4', label: 'Record payment' },
  { key: 'F12', label: 'Complete sale' },
  { key: 'Esc', label: 'Clear cart' },
]

const isRegister = computed(() => route.name === 'pos-register')

function handleLogout() {
  auth.logout()
}

function openPaymentModal() {
  showPaymentModal.value = true
}

provide('posOpenPayment', openPaymentModal)
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <aside class="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div class="border-b border-gray-200 px-4 py-5">
        <div class="flex items-center gap-2">
          <LayoutGrid class="h-5 w-5 text-gray-700" />
          <div>
            <p class="text-sm font-semibold text-gray-900">POS</p>
            <p class="text-xs text-gray-500">{{ auth.staff?.name }}</p>
          </div>
        </div>
      </div>

      <nav class="flex flex-1 flex-col gap-1 p-3">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          active-class="!bg-gray-100 !font-medium !text-gray-900"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          {{ item.name }}
        </RouterLink>

        <button
          type="button"
          class="mt-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50"
          @click="openPaymentModal"
        >
          <Wallet class="h-4 w-4 shrink-0" />
          Record payment
          <span class="ml-auto text-xs text-gray-400">F4</span>
        </button>
      </nav>

      <div class="border-t border-gray-200 p-3">
        <RouterLink
          v-if="auth.isManager"
          to="/admin"
          class="mb-2 block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Admin panel
        </RouterLink>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          @click="handleLogout"
        >
          <LogOut class="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <div
        v-if="isRegister"
        class="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6 py-2 text-xs text-gray-500"
      >
        <span class="font-medium text-gray-700">Shortcuts:</span>
        <span v-for="hk in hotkeys" :key="hk.key" class="rounded border border-gray-200 px-2 py-0.5">
          <kbd class="font-mono text-gray-800">{{ hk.key }}</kbd> {{ hk.label }}
        </span>
      </div>

      <main class="flex-1 overflow-auto p-6 md:p-8">
        <RouterView />
      </main>
    </div>

    <ClientPaymentModal
      v-if="showPaymentModal"
      @close="showPaymentModal = false"
      @recorded="showPaymentModal = false"
    />
  </div>
</template>
