<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { LayoutDashboard, Package, Store, ArrowDownToLine, ClipboardList, Users, Settings, LogOut, UserCircle, Bell, Receipt, Menu, X, Factory } from 'lucide-vue-next'
import ShopSelector from '@/components/admin/ShopSelector.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { api } from '@/services/api'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const menuOpen = ref(false)
const switchingWorkshop = ref(false)
const switchError = ref('')

const navItems = computed(() => {
  const items = [
    { to: '/admin', label: t('admin.nav.dashboard'), icon: LayoutDashboard, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/shops', label: t('admin.nav.shops'), icon: Store, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/products', label: t('admin.nav.products'), icon: Package, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/stock', label: t('admin.nav.stock'), icon: ClipboardList, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/inbound', label: t('admin.nav.inbound'), icon: ArrowDownToLine, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/orders', label: t('admin.nav.orders'), icon: ClipboardList, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
    { to: '/admin/clients', label: t('admin.nav.clients'), icon: UserCircle, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/credit/reminders', label: t('admin.nav.creditReminders'), icon: Bell, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/charges', label: t('admin.nav.charges'), icon: Receipt, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/staff', label: t('admin.nav.staff'), icon: Users, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/settings', label: t('admin.nav.settings'), icon: Settings, roles: ['OWNER', 'MANAGER'] },
  ]

  if (auth.isOwner) {
    items.push({ to: '/admin/network', label: t('admin.nav.network'), icon: Store, roles: ['OWNER'] })
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
      throw new Error(t('admin.factory.redirectMissing'))
    }
    window.location.assign(redirectUrl)
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } }; message?: string }
    switchError.value =
      ax.response?.data?.message ?? ax.message ?? t('admin.factory.openFailed')
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
        class="flex h-11 w-11 items-center justify-center -ms-2 text-gray-700"
        :aria-label="t('admin.a11y.openMenu')"
        @click="menuOpen = true"
      >
        <Menu class="h-6 w-6" />
      </button>
      <h1 class="text-base font-semibold text-gray-900">{{ t('admin.brand.name') }}</h1>
      <div class="flex items-center gap-2">
        <LanguageSwitcher />
        <button
          v-if="auth.isOwner"
          type="button"
          class="inline-flex h-9 max-w-[9.5rem] items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-800 disabled:opacity-60"
          :disabled="switchingWorkshop"
          :aria-label="t('admin.factory.switchAria')"
          @click="switchToWorkshop"
        >
          <Factory class="h-4 w-4 shrink-0" />
          <span class="truncate">{{ switchingWorkshop ? t('admin.factory.openingShort') : t('admin.factory.label') }}</span>
        </button>
        <div v-else class="w-11"></div>
      </div>
    </header>
    <p
      v-if="switchError"
      class="fixed inset-x-0 top-14 z-30 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600 lg:hidden"
    >
      {{ switchError }}
    </p>

    <!-- Mobile drawer overlay -->
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      @click="menuOpen = false"
    ></div>

    <!-- Sidebar: off-canvas on mobile only. Hide-transforms must not apply at lg+
         because `rtl:translate-x-full` is more specific than `lg:translate-x-0`. -->
    <aside
      class="fixed inset-y-0 start-0 z-50 w-72 shrink-0 overflow-y-auto border-e border-gray-200 bg-white p-5 transition-transform duration-200 lg:static lg:z-auto lg:w-56 lg:translate-x-0 rtl:lg:translate-x-0"
      :class="menuOpen ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'"
    >
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900">{{ t('admin.brand.name') }}</h1>
          <p class="mt-1 text-sm text-gray-500">{{ auth.staff?.name }}</p>
        </div>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center text-gray-500 lg:hidden"
          :aria-label="t('admin.a11y.closeMenu')"
          @click="menuOpen = false"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <ShopSelector v-if="auth.isOwner" class="mb-5" />
      <LanguageSwitcher class="mb-5" />

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
        {{ switchingWorkshop ? t('admin.factory.opening') : t('admin.factory.switch') }}
      </button>
      <button
        class="mt-2 flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        :class="auth.isOwner ? '' : 'mt-8'"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4" />
        {{ t('admin.nav.logout') }}
      </button>
    </aside>

    <main class="flex-1 overflow-auto p-4 pt-20 md:p-8 lg:pt-8">
      <RouterView />
    </main>
  </div>
</template>
