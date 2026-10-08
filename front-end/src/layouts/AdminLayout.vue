<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard,
  Package,
  Store,
  ArrowDownToLine,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  UserCircle,
  Bell,
  Receipt,
  Menu,
  X,
  Factory,
  ShoppingCart,
  Boxes,
  Network,
  ChevronsUpDown,
  ArrowUpRight,
} from 'lucide-vue-next'
import ShopSelector from '@/components/admin/ShopSelector.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import AdminToasts from '@/components/admin/AdminToasts.vue'
import { api } from '@/services/api'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const menuOpen = ref(false)
const switchingWorkshop = ref(false)
const switchError = ref('')

const accountMenuOpen = ref(false)

interface NavItem {
  to: string
  label: string
  icon: typeof Store
  roles: string[]
  external?: boolean
}

/** Sidebar grouped by job: what's happening, selling, the catalog, running the shop. */
const navGroups = computed(() => {
  const groups: Array<{ id: string; label: string; items: NavItem[] }> = [
    {
      id: 'overview',
      label: t('admin.navGroup.overview'),
      items: [
        { to: '/admin', label: t('admin.nav.dashboard'), icon: LayoutDashboard, roles: ['OWNER', 'MANAGER'] },
        { to: '/admin/network', label: t('admin.nav.network'), icon: Network, roles: ['OWNER'] },
      ],
    },
    {
      id: 'sales',
      label: t('admin.navGroup.sales'),
      items: [
        // Same JWT session: owners/managers cashier as themselves (sale.cashierId = staff.id).
        { to: '/pos', label: t('admin.nav.cashier'), icon: ShoppingCart, roles: ['OWNER', 'MANAGER'], external: true },
        { to: '/admin/orders', label: t('admin.nav.orders'), icon: ClipboardList, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
        { to: '/admin/clients', label: t('admin.nav.clients'), icon: UserCircle, roles: ['OWNER', 'MANAGER'] },
        { to: '/admin/credit/reminders', label: t('admin.nav.creditReminders'), icon: Bell, roles: ['OWNER', 'MANAGER'] },
      ],
    },
    {
      id: 'catalog',
      label: t('admin.navGroup.catalog'),
      items: [
        { to: '/admin/products', label: t('admin.nav.products'), icon: Package, roles: ['OWNER', 'MANAGER'] },
        { to: '/admin/stock', label: t('admin.nav.stock'), icon: Boxes, roles: ['OWNER', 'MANAGER'] },
        { to: '/admin/inbound', label: t('admin.nav.inbound'), icon: ArrowDownToLine, roles: ['OWNER', 'MANAGER'] },
      ],
    },
    {
      id: 'operations',
      label: t('admin.navGroup.operations'),
      items: [
        { to: '/admin/charges', label: t('admin.nav.charges'), icon: Receipt, roles: ['OWNER', 'MANAGER'] },
        { to: '/admin/shops', label: t('admin.nav.shops'), icon: Store, roles: ['OWNER', 'MANAGER'] },
        { to: '/admin/staff', label: t('admin.nav.staff'), icon: Users, roles: ['OWNER', 'MANAGER'] },
        { to: '/admin/settings', label: t('admin.nav.settings'), icon: Settings, roles: ['OWNER', 'MANAGER'] },
      ],
    },
  ]
  const role = auth.staff?.role ?? ''
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length)
})

const staffName = computed(() => auth.staff?.name ?? t('common.staff'))
const initials = computed(() =>
  staffName.value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

function roleLabel(role: string | undefined) {
  if (!role) return ''
  const key = `admin.staff.role.${role}`
  const label = t(key)
  return label !== key ? label : role
}

function isActive(path: string) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}

function handleLogout() {
  accountMenuOpen.value = false
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

// Close the mobile drawer and account menu whenever navigation happens
watch(() => route.path, () => {
  menuOpen.value = false
  accountMenuOpen.value = false
})
</script>

<template>
  <div class="pos flex min-h-dvh">
    <!-- Phone/tablet top bar -->
    <header
      class="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-white px-3 lg:hidden"
      style="box-shadow: 0 1px 0 var(--color-pos-line) !important"
    >
      <button type="button" class="pos-icon-btn" :aria-label="t('admin.a11y.openMenu')" :aria-expanded="menuOpen" @click="menuOpen = true">
        <Menu class="h-5 w-5" />
      </button>
      <RouterLink to="/admin" class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-pos-espresso text-[13px] font-semibold text-white">G</span>
        <span class="text-[15px] font-semibold text-pos-ink">{{ t('admin.brand.name') }}</span>
      </RouterLink>
      <div class="ms-auto">
        <LanguageSwitcher variant="segmented" />
      </div>
    </header>

    <!-- Drawer backdrop -->
    <Transition name="pos-pop">
      <div v-if="menuOpen" class="pos-backdrop z-40 lg:hidden" @click="menuOpen = false" />
    </Transition>

    <!-- Sidebar: off-canvas below lg. Hide-transforms must not apply at lg+
         because `rtl:translate-x-full` is more specific than `lg:translate-x-0`. -->
    <aside
      class="fixed inset-y-0 start-0 z-50 flex w-72 shrink-0 flex-col bg-white transition-transform duration-300 ease-[var(--ease-pos)] lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-64 lg:translate-x-0 lg:bg-pos-canvas rtl:lg:translate-x-0"
      :class="menuOpen ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'"
      :aria-label="t('admin.a11y.sidebar')"
    >
      <div class="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
        <RouterLink to="/admin" class="flex min-w-0 items-center gap-2.5 rounded-lg">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-pos-espresso text-[14px] font-semibold text-white">G</span>
          <span class="truncate text-[15px] font-semibold tracking-[-0.01em] text-pos-ink">{{ t('admin.brand.name') }}</span>
        </RouterLink>
        <button type="button" class="pos-icon-btn lg:hidden" :aria-label="t('admin.a11y.closeMenu')" @click="menuOpen = false">
          <X class="h-5 w-5" />
        </button>
      </div>

      <div v-if="auth.isOwner" class="px-4 pb-2">
        <ShopSelector />
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pb-4" :aria-label="t('admin.a11y.mainNav')">
        <div v-for="group in navGroups" :key="group.id" class="mt-3 first:mt-1">
          <p class="px-3 pb-1 text-[11.5px] font-medium text-pos-muted">{{ group.label }}</p>
          <ul class="flex flex-col gap-0.5">
            <li v-for="item in group.items" :key="item.to">
              <RouterLink
                :to="item.to"
                class="pos-side-link"
                :aria-current="isActive(item.to) ? 'page' : undefined"
              >
                <component :is="item.icon" class="h-[17px] w-[17px] shrink-0" />
                <span class="flex-1 truncate">{{ item.label }}</span>
                <ArrowUpRight v-if="item.external" class="h-3.5 w-3.5 text-pos-faint rtl:-scale-x-100" aria-hidden="true" />
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Footer: language + account -->
      <div class="flex flex-col gap-3 border-t border-black/[0.06] p-3">
        <LanguageSwitcher variant="segmented" class="hidden w-full lg:grid" />
        <p v-if="switchError" class="px-1 text-[12px] text-pos-err" role="alert">{{ switchError }}</p>
        <div class="relative">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl p-2 text-start transition-colors hover:bg-black/[0.04]"
            :aria-expanded="accountMenuOpen"
            aria-haspopup="menu"
            @click="accountMenuOpen = !accountMenuOpen"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-pos-ink" style="box-shadow: var(--pos-shadow-sm) !important">{{ initials }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13.5px] font-medium text-pos-ink">{{ staffName }}</span>
              <span class="block truncate text-[12px] text-pos-muted">{{ roleLabel(auth.staff?.role) }}</span>
            </span>
            <ChevronsUpDown class="h-4 w-4 shrink-0 text-pos-faint" />
          </button>
          <div v-if="accountMenuOpen" class="fixed inset-0 z-40" @click="accountMenuOpen = false" />
          <Transition name="pos-pop">
            <div
              v-if="accountMenuOpen"
              class="pos-menu start-0 end-0 bottom-full mb-2"
              role="menu"
              @keydown.esc="accountMenuOpen = false"
            >
              <div class="px-3 pt-2 pb-2.5">
                <p class="truncate text-[12px] text-pos-muted">{{ auth.staff?.email }}</p>
              </div>
              <div class="my-1 h-px bg-pos-line" />
              <button
                v-if="auth.isOwner"
                type="button"
                class="pos-menu-item"
                role="menuitem"
                :disabled="switchingWorkshop"
                @click="switchToWorkshop"
              >
                <Factory class="h-4 w-4 text-pos-muted" />
                {{ switchingWorkshop ? t('admin.factory.opening') : t('admin.factory.switch') }}
              </button>
              <button type="button" class="pos-menu-item" role="menuitem" @click="handleLogout">
                <LogOut class="h-4 w-4 text-pos-muted rtl:rotate-180" />
                {{ t('admin.nav.logout') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </aside>

    <main class="min-w-0 flex-1 px-4 pt-20 pb-10 sm:px-6 lg:px-10 lg:pt-8">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <Transition name="pos-page" mode="out-in">
          <component :is="Component" :key="viewRoute.path" />
        </Transition>
      </RouterView>
    </main>

    <AdminToasts />
  </div>
</template>
