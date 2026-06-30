<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LayoutDashboard, Package, Store, ArrowDownToLine, ClipboardList, Users, Settings, LogOut, UserCircle, Bell, Receipt } from 'lucide-vue-next'
import ShopSelector from '@/components/admin/ShopSelector.vue'

const auth = useAuthStore()
const route = useRoute()

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
</script>

<template>
  <div class="flex min-h-screen bg-white">
    <aside class="w-56 shrink-0 border-r border-gray-200 p-5">
      <div class="mb-6">
        <h1 class="text-lg font-semibold text-gray-900">Galatk Retail</h1>
        <p class="mt-1 text-sm text-gray-500">{{ auth.staff?.name }}</p>
      </div>

      <ShopSelector v-if="auth.isOwner" class="mb-5" />

      <nav class="flex flex-col gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors"
          :class="isActive(item.to) ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <button
        class="mt-8 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4" />
        Logout
      </button>
    </aside>

    <main class="flex-1 overflow-auto p-6 md:p-8">
      <RouterView />
    </main>
  </div>
</template>
