<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LayoutDashboard, Package, Store, ArrowDownToLine, ClipboardList, Users, Settings, LogOut, UserCircle, Bell, Receipt, Menu, X, Factory } from 'lucide-vue-next'
import ShopSelector from '@/components/admin/ShopSelector.vue'
import { api } from '@/services/api'

const auth = useAuthStore()
const route = useRoute()
const menuOpen = ref(false)
const switchingWorkshop = ref(false)
const switchError = ref('')

const navItems = computed(() => {
  const items = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/shops', label: 'Shops', icon: Store, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/products', label: 'Products', icon: Package, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/stock', label: 'Stock', icon: ClipboardList, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/inbound', label: 'Inbound', icon: ArrowDownToLine, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
    { to: '/admin/clients', label: 'Clients', icon: UserCircle, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/credit/reminders', label: 'Credit reminders', icon: Bell, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/charges', label: 'Charges', icon: Receipt, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/staff', label: 'Staff', icon: Users, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['OWNER', 'MANAGER'] },
  ]

  if (auth.isOwner) {
    items.push({ to: '/admin/network', label: 'Network', icon: Store, roles: ['OWNER'] })
  }

  return items.filter((item) => item.roles.includes(auth.staff?.role ?? ''))
})

function isActive(path: string) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}

function handleLogout() {
  auth.logout()
}

async function switchToWorkshop() {
  if (switchingWorkshop.value) return
  switchingWorkshop.value = true
  switchError.value = ''
  try {
    const { data } = await api.post<{ data: { redirectUrl: string } }>('/auth/sso/launch-workshop')
    const redirectUrl = data.data?.redirectUrl
    if (!redirectUrl) {
      throw new Error('Workshop did not return a redirect URL')
    }
    window.location.assign(redirectUrl)
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } }; message?: string }
    switchError.value =
      ax.response?.data?.message ?? ax.message ?? 'Could not open Workshop'
    switchingWorkshop.value = false
  }
}

// Close the mobile drawer whenever navigation happens
watch(() => route.path, () => {
  menuOpen.value = false
})
</script>

<template>
  <div class="flex min-h-screen bg-white">
    <!-- Mobile top bar -->
    <header class="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center -ml-2 text-gray-700"
        aria-label="Open menu"
        @click="menuOpen = true"
      >
        <Menu class="h-6 w-6" />
      </button>
      <h1 class="text-base font-semibold text-gray-900">Galatk Retail</h1>
      <div class="w-11"></div>
    </header>

    <!-- Mobile drawer overlay -->
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      @click="menuOpen = false"
    ></div>

    <!-- Sidebar: fixed drawer on mobile, static column on desktop -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-5 transition-transform duration-200 lg:static lg:z-auto lg:w-56 lg:translate-x-0"
      :class="menuOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900">Galatk Retail</h1>
          <p class="mt-1 text-sm text-gray-500">{{ auth.staff?.name }}</p>
        </div>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center text-gray-500 lg:hidden"
          aria-label="Close menu"
          @click="menuOpen = false"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <ShopSelector v-if="auth.isOwner" class="mb-5" />

      <nav class="flex flex-col gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors"
          :class="isActive(item.to) ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <p v-if="switchError" class="mt-6 px-1 text-xs text-red-600">{{ switchError }}</p>
      <button
        v-if="auth.isOwner"
        type="button"
        class="mt-6 flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        :disabled="switchingWorkshop"
        @click="switchToWorkshop"
      >
        <Factory class="h-4 w-4" />
        {{ switchingWorkshop ? 'Opening Workshop…' : 'Switch to Workshop' }}
      </button>
      <button
        class="mt-2 flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        :class="auth.isOwner ? '' : 'mt-8'"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4" />
        Logout
      </button>
    </aside>

    <main class="flex-1 overflow-auto p-4 pt-20 md:p-8 lg:pt-8">
      <RouterView />
    </main>
  </div>
</template>
