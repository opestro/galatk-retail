<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { formatCount, formatMoney } from '@/utils/formatMoney'
import { apiErrorMessage, createProductFamily, uploadFamilyImage } from '@/services/products'
import { useAuthStore } from '@/stores/auth'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import PageHeader from '@/components/ui/PageHeader.vue'
import ProductEditorShell from '@/components/admin/products/ProductEditorShell.vue'
import ProductInformationCard from '@/components/admin/products/ProductInformationCard.vue'
import ProductImageManager from '@/components/admin/products/ProductImageManager.vue'
import VariantModal from '@/components/admin/products/VariantModal.vue'
import {
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_NAME_MAX,
  draftKey,
  draftToPayload,
  emptyVariantDraft,
  type VariantDraft,
} from '@/components/admin/products/variantDraft'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const productForm = reactive({
  name: '',
  description: '',
  availableOnline: true,
  isActive: true,
})

const pendingFiles = ref<File[]>([])
const pendingUrls = ref<string[]>([])
const variants = ref<VariantDraft[]>([])
const modalOpen = ref(false)
const modalDraft = ref<VariantDraft>(emptyVariantDraft())
const editingIndex = ref<number | null>(null)
const submitting = ref(false)
const error = ref('')
const allowLeave = ref(false)

const isDirty = computed(() => {
  if (allowLeave.value) return false
  return (
    productForm.name.trim() !== '' ||
    productForm.description.trim() !== '' ||
    pendingFiles.value.length > 0 ||
    variants.value.length > 0
  )
})
useUnsavedChanges(isDirty)

const extraColors = computed(() => variants.value.map((v) => v.color).filter(Boolean))
const extraSizes = computed(() => variants.value.map((v) => v.size).filter(Boolean))

function revokeUrls() {
  for (const url of pendingUrls.value) URL.revokeObjectURL(url)
}

function setPendingFiles(files: File[]) {
  revokeUrls()
  pendingFiles.value = files
  pendingUrls.value = files.map((file) => URL.createObjectURL(file))
}

function onUpload(files: File[]) {
  setPendingFiles([...pendingFiles.value, ...files])
}

function onRemovePending(index: number) {
  const next = pendingFiles.value.filter((_, i) => i !== index)
  setPendingFiles(next)
}

function goBack() {
  router.push({ name: 'admin-products' })
}

function openAddVariant() {
  editingIndex.value = null
  modalDraft.value = emptyVariantDraft()
  modalOpen.value = true
}

function openEditVariant(index: number) {
  editingIndex.value = index
  modalDraft.value = { ...variants.value[index]! }
  modalOpen.value = true
}

function saveDraftVariant() {
  const payload = draftToPayload(modalDraft.value)
  if (!payload) {
    error.value = t('admin.productCreate.variantInvalid')
    return
  }
  const key = draftKey(modalDraft.value)
  const duplicateIndex = variants.value.findIndex((row, i) => draftKey(row) === key && i !== editingIndex.value)
  if (duplicateIndex >= 0) {
    const existing = variants.value[duplicateIndex]!
    const mergedQty = Number(existing.quantity) + Number(modalDraft.value.quantity)
    const next = [...variants.value]
    next[duplicateIndex] = { ...modalDraft.value, quantity: mergedQty }
    if (editingIndex.value != null) next.splice(editingIndex.value, 1)
    variants.value = next
    modalOpen.value = false
    error.value = ''
    return
  }
  error.value = ''
  if (editingIndex.value == null) {
    variants.value = [...variants.value, { ...modalDraft.value }]
  } else {
    const next = [...variants.value]
    next[editingIndex.value] = { ...modalDraft.value }
    variants.value = next
  }
  modalOpen.value = false
}

async function createProduct() {
  const name = productForm.name.trim()
  if (!name) {
    error.value = t('admin.product.nameRequired')
    return
  }
  if (name.length > PRODUCT_NAME_MAX) {
    error.value = t('admin.product.nameTooLong', { n: PRODUCT_NAME_MAX })
    return
  }
  if (productForm.description.length > PRODUCT_DESCRIPTION_MAX) {
    error.value = t('admin.product.descriptionTooLong', { n: PRODUCT_DESCRIPTION_MAX })
    return
  }
  const rows = variants.value.map(draftToPayload)
  if (rows.some((row) => row === null)) {
    error.value = t('admin.productCreate.variantsInvalid')
    return
  }
  if (rows.some((row) => (row?.quantity ?? 0) > 0) && !auth.selectedShopId) {
    error.value = t('admin.product.selectShopForStock')
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const family = await createProductFamily({
      name,
      description: productForm.description,
      availableOnline: productForm.availableOnline,
      isActive: productForm.isActive,
      variants: rows.filter((row) => row !== null),
      shopId: auth.selectedShopId ?? undefined,
    })
    for (const file of pendingFiles.value) {
      await uploadFamilyImage(family.id, file)
    }
    allowLeave.value = true
    await router.replace({ name: 'admin-product-detail', params: { familyId: family.id } })
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.productCreate.failed'))
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(revokeUrls)
</script>

<template>
  <div class="page-shell">
    <ProductEditorShell>
      <template #header>
        <PageHeader
          :title="t('admin.productCreate.title')"
          :subtitle="t('admin.productCreate.subtitle')"
          :back="{ name: 'admin-products' }"
          :back-label="t('admin.products.back')"
        >
          <template #actions>
            <button type="button" class="pos-btn-ghost" :disabled="submitting" @click="goBack">{{ t('common.cancel') }}</button>
            <button type="button" class="pos-btn-primary" :disabled="submitting" @click="createProduct">
              <span v-if="submitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              {{ submitting ? t('admin.productCreate.creating') : t('admin.productCreate.create') }}
            </button>
          </template>
        </PageHeader>
        <p v-if="error && !modalOpen" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
          <AlertCircle class="mt-px h-4 w-4 shrink-0" />
          {{ error }}
        </p>
      </template>

      <template #information>
        <ProductInformationCard
          :name="productForm.name"
          :description="productForm.description"
          :available-online="productForm.availableOnline"
          :is-active="productForm.isActive"
          @update:name="productForm.name = $event"
          @update:description="productForm.description = $event"
          @update:available-online="productForm.availableOnline = $event"
          @update:is-active="productForm.isActive = $event"
        />
      </template>

      <template #images>
        <ProductImageManager
          :images="[]"
          :pending-urls="pendingUrls"
          :disabled="submitting"
          @upload="onUpload"
          @remove-pending="onRemovePending"
        />
      </template>

      <template #variants>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="section-title">{{ t('admin.variant.sectionTitle') }}</h2>
            <p class="mt-0.5 text-[12.5px] text-pos-muted">{{ t('admin.productCreate.variantsHint') }}</p>
          </div>
          <button type="button" class="pos-btn-soft" @click="openAddVariant">
            <Plus class="h-4 w-4" />
            {{ t('admin.variant.add') }}
          </button>
        </div>

        <div v-if="variants.length" class="-mx-6 overflow-x-auto">
          <table class="pos-table min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" class="ps-6">{{ t('admin.variant.color') }}</th>
                <th scope="col">{{ t('admin.variant.size') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.variant.cost') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.variant.price') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.variant.stock') }}</th>
                <th scope="col" class="pos-cell-actions pe-6"><span class="sr-only">{{ t('common.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(variant, index) in variants" :key="index">
                <td class="ps-6 font-medium text-pos-ink">{{ variant.color || t('common.emDash') }}</td>
                <td class="text-pos-ink-2">{{ variant.size || t('common.emDash') }}</td>
                <td class="pos-cell-num text-pos-muted">{{ formatMoney(variant.unitCost) }}</td>
                <td class="pos-cell-num font-medium text-pos-ink">{{ formatMoney(variant.sellPrice) }}</td>
                <td class="pos-cell-num">{{ formatCount(Number(variant.quantity) || 0) }}</td>
                <td class="pos-cell-actions pe-6">
                  <div class="flex items-center justify-end gap-1">
                    <button type="button" class="pos-icon-btn h-9 w-9" :aria-label="t('common.edit')" :title="t('common.edit')" @click="openEditVariant(index)">
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="pos-icon-btn h-9 w-9 hover:bg-pos-err-bg hover:text-pos-err"
                      :aria-label="t('common.delete')"
                      :title="t('common.delete')"
                      @click="variants = variants.filter((_, i) => i !== index)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          v-else
          type="button"
          class="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9d9d9] px-4 py-10 text-[13px] text-pos-muted transition-colors hover:border-pos-faint hover:bg-pos-sunken/60"
          @click="openAddVariant"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-pos-muted" style="box-shadow: var(--pos-shadow-sm) !important">
            <Plus class="h-[18px] w-[18px]" />
          </span>
          <span class="font-medium text-pos-ink">{{ t('admin.variant.addPlain') }}</span>
          <span>{{ t('admin.variant.empty') }}</span>
        </button>
      </template>
    </ProductEditorShell>

    <VariantModal
      v-if="modalOpen"
      :title="editingIndex == null ? t('admin.variant.addTitle') : t('admin.variant.editTitle')"
      :model-value="modalDraft"
      :extra-colors="extraColors"
      :extra-sizes="extraSizes"
      :quantity-label="t('admin.variant.availableQuantity')"
      :submit-label="editingIndex == null ? t('admin.variant.addSubmit') : t('admin.variant.saveChanges')"
      :error="error"
      :quantity-hint="t('admin.variant.stockZeroHint')"
      @update:model-value="modalDraft = $event"
      @cancel="modalOpen = false; error = ''"
      @submit="saveDraftVariant"
    />
  </div>
</template>
