<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
import { api } from '@/services/api'
import { apiErrorMessage } from '@/services/products'
import type { StaffPermission } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'
import { useToast } from '@/composables/useToast'
import { formatCount } from '@/utils/formatMoney'

type EditableRole = 'MANAGER' | 'CASHIER'

interface GroupRow {
  id: string
  name: string
  permissions: StaffPermission[]
  memberCount: number
}

interface RolesPayload {
  roles: Array<{ role: EditableRole; permissions: StaffPermission[] }>
  categories: Array<{ id: string; permissions: StaffPermission[] }>
  defaults: Record<string, StaffPermission[]>
  groups: GroupRow[]
}

/** What is being edited: a built-in role ("role:MANAGER"), a custom group ("group:<id>") or "new". */
interface Entry {
  name: string
  permissions: StaffPermission[]
}

const { t } = useI18n()
const toast = useToast()

const data = ref<RolesPayload | null>(null)
const loadError = ref('')
const error = ref('')
const saving = ref(false)
const selected = ref('role:CASHIER')
const confirmDelete = ref(false)
// What the server has, and what the owner is editing, per entry key.
const saved = ref<Record<string, Entry>>({})
const draft = ref<Record<string, Entry>>({})

const isGroup = computed(() => selected.value.startsWith('group:') || selected.value === 'new')
const isNew = computed(() => selected.value === 'new')
const current = computed<Entry>(() => draft.value[selected.value] ?? { name: '', permissions: [] })

const dirty = computed(() => {
  const a = draft.value[selected.value]
  const b = saved.value[selected.value]
  if (!a) return false
  if (isNew.value) return true
  if (!b) return false
  return a.name !== b.name || [...a.permissions].sort().join() !== [...b.permissions].sort().join()
})

function remember(key: string, entry: Entry) {
  saved.value[key] = { name: entry.name, permissions: [...entry.permissions] }
  draft.value[key] = { name: entry.name, permissions: [...entry.permissions] }
}

async function load(select?: string) {
  try {
    const res = await api.get<{ data: RolesPayload }>('/roles')
    data.value = res.data.data
    saved.value = {}
    draft.value = {}
    for (const r of data.value.roles) remember(`role:${r.role}`, { name: r.role, permissions: r.permissions })
    for (const g of data.value.groups) remember(`group:${g.id}`, { name: g.name, permissions: g.permissions })
    if (select) selected.value = select
  } catch (e) {
    loadError.value = apiErrorMessage(e, t('admin.roles.loadError'))
  }
}

const has = (p: StaffPermission) => current.value.permissions.includes(p)

function setPermissions(next: StaffPermission[]) {
  draft.value[selected.value] = { ...current.value, permissions: next }
}

function toggle(p: StaffPermission) {
  setPermissions(has(p) ? current.value.permissions.filter((x) => x !== p) : [...current.value.permissions, p])
}

function groupState(perms: StaffPermission[]): 'all' | 'some' | 'none' {
  const n = perms.filter(has).length
  return n === 0 ? 'none' : n === perms.length ? 'all' : 'some'
}

function toggleCategory(perms: StaffPermission[]) {
  const rest = current.value.permissions.filter((p) => !perms.includes(p))
  setPermissions(groupState(perms) === 'all' ? rest : [...rest, ...perms])
}

function resetToDefault() {
  const role = selected.value.replace('role:', '')
  setPermissions([...(data.value?.defaults[role] ?? [])])
}

function startNew() {
  draft.value.new = { name: '', permissions: [] }
  selected.value = 'new'
  error.value = ''
}

function discard() {
  if (isNew.value) {
    delete draft.value.new
    selected.value = 'role:CASHIER'
    return
  }
  const original = saved.value[selected.value]
  if (original) remember(selected.value, original)
}

function select(key: string) {
  if (selected.value === 'new' && key !== 'new') delete draft.value.new
  selected.value = key
  error.value = ''
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (isNew.value) {
      if (!current.value.name.trim()) {
        error.value = t('admin.roles.nameRequired')
        return
      }
      const res = await api.post<{ data: GroupRow }>('/roles/groups', current.value)
      toast.success(t('admin.roles.created'))
      await load(`group:${res.data.data.id}`)
    } else if (selected.value.startsWith('group:')) {
      await api.patch(`/roles/groups/${selected.value.slice(6)}`, current.value)
      toast.success(t('admin.roles.saved'))
      await load(selected.value)
    } else {
      await api.put(`/roles/${selected.value.slice(5)}`, { permissions: current.value.permissions })
      remember(selected.value, current.value)
      toast.success(t('admin.roles.saved'))
    }
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.roles.saveError'))
  } finally {
    saving.value = false
  }
}

async function removeGroup() {
  try {
    await api.delete(`/roles/groups/${selected.value.slice(6)}`)
    toast.success(t('admin.roles.deleted'))
    confirmDelete.value = false
    await load('role:CASHIER')
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.roles.saveError'))
    confirmDelete.value = false
  }
}

const memberCount = computed(() => data.value?.groups.find((g) => `group:${g.id}` === selected.value)?.memberCount ?? 0)

onMounted(() => load())
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.roles.title')" :subtitle="t('admin.roles.subtitle')" />

    <p v-if="loadError" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
      <AlertCircle class="mt-px h-4 w-4 shrink-0" />
      {{ loadError }}
    </p>

    <div v-else-if="data" class="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav class="pos-surface flex flex-col gap-1 p-2" :aria-label="t('admin.roles.title')">
        <p class="px-3 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide text-pos-faint uppercase">{{ t('admin.roles.rolesTitle') }}</p>
        <button
          v-for="r in data.roles"
          :key="r.role"
          type="button"
          class="flex flex-col rounded-xl px-3 py-2 text-start transition-colors"
          :class="selected === `role:${r.role}` ? 'bg-pos-sunken text-pos-ink' : 'text-pos-muted hover:bg-pos-sunken/60'"
          :aria-current="selected === `role:${r.role}`"
          @click="select(`role:${r.role}`)"
        >
          <span class="text-[14px] font-semibold">{{ t(`admin.staff.role.${r.role}`) }}</span>
          <span class="text-[12px]">{{ t('admin.roles.count', { n: formatCount(draft[`role:${r.role}`]?.permissions.length ?? 0) }) }}</span>
        </button>

        <p class="px-3 pt-3 pb-0.5 text-[11px] font-semibold tracking-wide text-pos-faint uppercase">{{ t('admin.roles.groupsTitle') }}</p>
        <button
          v-for="g in data.groups"
          :key="g.id"
          type="button"
          class="flex flex-col rounded-xl px-3 py-2 text-start transition-colors"
          :class="selected === `group:${g.id}` ? 'bg-pos-sunken text-pos-ink' : 'text-pos-muted hover:bg-pos-sunken/60'"
          :aria-current="selected === `group:${g.id}`"
          @click="select(`group:${g.id}`)"
        >
          <span class="truncate text-[14px] font-semibold">{{ saved[`group:${g.id}`]?.name ?? g.name }}</span>
          <span class="text-[12px]">{{ t('admin.roles.members', { n: formatCount(g.memberCount) }, g.memberCount) }}</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] font-medium text-pos-accent hover:bg-pos-sunken/60"
          :class="isNew ? 'bg-pos-sunken' : ''"
          @click="startNew"
        >
          <Plus class="h-4 w-4" />
          {{ t('admin.roles.newGroup') }}
        </button>

        <div class="mt-2 rounded-xl px-3 py-2.5 text-[12px] text-pos-muted">
          <span class="block font-semibold text-pos-ink-2">{{ t('admin.staff.role.OWNER') }}</span>
          {{ t('admin.roles.ownerNote') }}
        </div>
      </nav>

      <section class="pos-surface flex flex-col gap-5 p-6">
        <div v-if="isGroup" class="flex flex-wrap items-end gap-3">
          <label class="pos-field min-w-0 flex-1 sm:max-w-sm">
            <span class="pos-label">{{ t('admin.roles.groupName') }}</span>
            <input
              :value="current.name"
              maxlength="40"
              class="pos-input"
              :placeholder="t('admin.roles.groupNamePlaceholder')"
              @input="draft[selected] = { ...current, name: ($event.target as HTMLInputElement).value }"
            />
          </label>
          <button v-if="!isNew" type="button" class="pos-btn-ghost text-pos-err" @click="confirmDelete = true">
            <Trash2 class="h-4 w-4" />
            {{ t('admin.roles.deleteGroup') }}
          </button>
        </div>
        <div v-else class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-[13px] text-pos-muted">{{ t('admin.roles.hint', { role: t(`admin.staff.role.${selected.slice(5)}`) }) }}</p>
          <button type="button" class="pos-btn-ghost pos-btn-sm" @click="resetToDefault">
            <RotateCcw class="h-4 w-4" />
            {{ t('admin.roles.reset') }}
          </button>
        </div>
        <p v-if="isGroup" class="-mt-2 text-[12.5px] text-pos-muted">
          {{ isNew ? t('admin.roles.groupHintNew') : t('admin.roles.groupHint', { n: formatCount(memberCount) }, memberCount) }}
        </p>

        <fieldset v-for="category in data.categories" :key="category.id" class="flex flex-col gap-1">
          <legend class="sr-only">{{ t(`admin.roles.group.${category.id}`) }}</legend>
          <label class="flex cursor-pointer items-center gap-2.5 border-b border-pos-line pb-2">
            <input
              type="checkbox"
              class="h-4 w-4"
              :checked="groupState(category.permissions) === 'all'"
              :indeterminate.prop="groupState(category.permissions) === 'some'"
              @change="toggleCategory(category.permissions)"
            />
            <span class="text-[13px] font-semibold tracking-wide text-pos-ink uppercase">{{ t(`admin.roles.group.${category.id}`) }}</span>
          </label>
          <label
            v-for="p in category.permissions"
            :key="p"
            class="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-2 hover:bg-pos-sunken/50"
          >
            <input type="checkbox" class="mt-0.5 h-4 w-4" :checked="has(p)" @change="toggle(p)" />
            <span class="min-w-0">
              <span class="block text-[14px] font-medium text-pos-ink">{{ t(`admin.roles.perm.${p}.label`) }}</span>
              <span class="block text-[12.5px] text-pos-muted">{{ t(`admin.roles.perm.${p}.desc`) }}</span>
            </span>
          </label>
        </fieldset>

        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
          <AlertCircle class="mt-px h-4 w-4 shrink-0" />
          {{ error }}
        </p>
      </section>
    </div>

    <div v-if="dirty" class="sticky bottom-4 z-10 flex justify-end">
      <div class="pos-surface flex items-center gap-3 p-2 ps-4" style="box-shadow: var(--pos-shadow-lg) !important">
        <span class="text-[13px] text-pos-muted">{{ t('admin.product.unsavedChanges') }}</span>
        <button type="button" class="pos-btn-ghost pos-btn-sm" @click="discard">{{ t('admin.product.discard') }}</button>
        <button type="button" class="pos-btn-primary pos-btn-sm" :disabled="saving" @click="save">
          {{ saving ? t('common.saving') : isNew ? t('admin.roles.create') : t('admin.roles.save') }}
        </button>
      </div>
    </div>

    <AdminConfirm
      v-if="confirmDelete"
      :title="t('admin.roles.deleteTitle', { name: saved[selected]?.name ?? '' })"
      :body="t('admin.roles.deleteBody', { n: formatCount(memberCount) }, memberCount)"
      :confirm-label="t('common.delete')"
      danger
      @close="confirmDelete = false"
      @confirm="removeGroup"
    />
  </div>
</template>
