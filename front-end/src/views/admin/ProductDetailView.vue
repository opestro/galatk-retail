<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Plus } from 'lucide-vue-next'
import type { Product, ProductFamily } from '@/types/api'
import {
  addFamilyVariant,
  apiErrorMessage,
  deleteFamilyImage,
  deleteProduct,
  familyInStock,
  getProductFamily,
  setPrimaryFamilyImage,
  setVariantStock,
  updateProduct,
  updateProductFamily,
  uploadFamilyImage,
} from '@/services/products'
import { useAuthStore } from '@/stores/auth'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { formatCount } from '@/utils/formatMoney'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import ProductEditorShell from '@/components/admin/products/ProductEditorShell.vue'
import ProductInformationCard from '@/components/admin/products/ProductInformationCard.vue'
import ProductImageManager from '@/components/admin/products/ProductImageManager.vue'
import VariantTable from '@/components/admin/products/VariantTable.vue'
import VariantModal from '@/components/admin/products/VariantModal.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'
import { useToast } from '@/composables/useToast'
import {
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_NAME_MAX,
  attributesFromDraft,
  emptyVariantDraft,
  parseAmount,
  type VariantDraft,
} from '@/components/admin/products/variantDraft'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()

const familyId = computed(() => String(route.params.familyId))
const canManage = computed(() => auth.isManager)

const family = ref<ProductFamily | null>(null)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const variantBusy = ref(false)
const error = ref('')
const variantError = ref('')
const uploading = ref(false)
const uploadPercent = ref<number | null>(null)
const stockDraft = ref<Record<string, string>>({})
const stockState = ref<Record<string, 'idle' | 'saving' | 'error'>>({})
const allowLeave = ref(false)

const productForm = reactive({
  name: '',
  description: '',
  availableOnline: true,
  isActive: true,
})

const savedSnapshot = ref('')

function snapshotOf() {
  return JSON.stringify({
    name: productForm.name,
    description: productForm.description,
    availableOnline: productForm.availableOnline,
    isActive: productForm.isActive,
  })
}

const isDirty = computed(
  () => !allowLeave.value && savedSnapshot.value !== '' && snapshotOf() !== savedSnapshot.value,
)
useUnsavedChanges(isDirty)

const productUnavailable = computed(() => family.value != null && !familyInStock(family.value))

const extraColors = computed(() =>
  (family.value?.variants ?? []).map((v) => v.attributes?.color).filter((v): v is string => Boolean(v)),
)
const extraSizes = computed(() =>
  (family.value?.variants ?? []).map((v) => v.attributes?.size).filter((v): v is string => Boolean(v)),
)

const modalMode = ref<'add' | 'edit' | null>(null)
const editingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const confirmImageId = ref<string | null>(null)
const modalDraft = ref<VariantDraft>(emptyVariantDraft())

function applyFamily(next: ProductFamily) {
  family.value = next
  productForm.name = next.name
  productForm.description = next.description ?? ''
  productForm.availableOnline = next.availableOnline
  productForm.isActive = next.isActive
  for (const variant of next.variants) {
    stockDraft.value[variant.id] = String(variant.shopQuantity ?? 0)
  }
  savedSnapshot.value = snapshotOf()
}

async function loadFamily() {
  loading.value = true
  loadError.value = ''
  try {
    applyFamily(await getProductFamily(familyId.value, auth.selectedShopId ?? undefined))
  } catch (e) {
    loadError.value = apiErrorMessage(e, t('admin.product.notFound'))
    family.value = null
  } finally {
    loading.value = false
  }
}

watch([familyId, () => auth.selectedShopId], loadFamily, { immediate: true })

const variantSummary = computed(() => {
  const variants = family.value?.variants ?? []
  const stock = variants.reduce((sum, variant) => sum + (variant.shopQuantity ?? 0), 0)
  return t('admin.product.summary', { n: formatCount(variants.length), stock: formatCount(stock) }, variants.length)
})

async function saveProduct() {
  if (!family.value) return
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
  saving.value = true
  error.value = ''
    try {
    applyFamily(
      await updateProductFamily(
        family.value.id,
        {
          name,
          description: productForm.description,
          availableOnline: productForm.availableOnline,
          isActive: productForm.isActive,
        },
        auth.selectedShopId ?? undefined,
      ),
    )
    toast.success(t('admin.product.saved'))
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.product.saveError'))
  } finally {
    saving.value = false
  }
}

async function saveStock(variant: Product) {
  if (!canManage.value) return
  const shopId = auth.selectedShopId
  if (!shopId) {
    error.value = t('admin.product.selectShopForStockChange')
    return
  }
  const parsed = Number(stockDraft.value[variant.id])
  if (!Number.isInteger(parsed) || parsed < 0) {
    stockDraft.value[variant.id] = String(variant.shopQuantity ?? 0)
    error.value = t('admin.product.stockInvalid')
    return
  }
  if (parsed === (variant.shopQuantity ?? 0)) return
  stockState.value[variant.id] = 'saving'
  error.value = ''
  try {
    await setVariantStock(variant.id, shopId, parsed)
    applyFamily(await getProductFamily(familyId.value, shopId))
    toast.success(parsed === 0 ? t('admin.product.stockZeroFeedback') : t('admin.product.stockUpdated'))
    stockState.value[variant.id] = 'idle'
  } catch (e) {
    stockDraft.value[variant.id] = String(variant.shopQuantity ?? 0)
    stockState.value[variant.id] = 'error'
    error.value = apiErrorMessage(e, t('admin.product.stockUpdateError'))
  }
}

function openAddVariant() {
  modalDraft.value = emptyVariantDraft()
  editingId.value = null
  variantError.value = ''
  modalMode.value = 'add'
}

function startEdit(variantId: string) {
  const variant = family.value?.variants.find((v) => v.id === variantId)
  if (!variant) return
  editingId.value = variantId
  modalDraft.value = {
    color: variant.attributes?.color ?? '',
    size: variant.attributes?.size ?? '',
    unitCost: variant.unitCost,
    sellPrice: variant.sellPrice,
    quantity: variant.shopQuantity ?? 0,
    availableOnline: variant.availableOnline,
    isActive: variant.isActive,
  }
  modalMode.value = 'edit'
  variantError.value = ''
}

async function submitVariant() {
  if (modalMode.value === 'add') {
    await submitNewVariant()
    return
  }
  await saveEdit()
}

async function submitNewVariant() {
  if (!family.value) return
  const attrs = attributesFromDraft(modalDraft.value)
  if (!attrs.color && !attrs.size) {
    variantError.value = t('admin.variant.needColorOrSize')
    return
  }
  const sellPrice = parseAmount(modalDraft.value.sellPrice)
  const unitCost = parseAmount(modalDraft.value.unitCost)
  const quantity = Number(modalDraft.value.quantity)
  if (sellPrice === null || unitCost === null) {
    variantError.value = t('admin.variant.invalidAmounts')
    return
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    variantError.value = t('admin.variant.quantityInvalid')
    return
  }
  if (quantity > 0 && !auth.selectedShopId) {
    variantError.value = t('admin.product.selectShopForStock')
    return
  }
  variantBusy.value = true
  variantError.value = ''
  error.value = ''
    try {
    const result = await addFamilyVariant(family.value.id, {
      attributes: attrs,
      unitCost,
      sellPrice,
      quantity,
      availableOnline: modalDraft.value.availableOnline,
      isActive: modalDraft.value.isActive,
      shopId: auth.selectedShopId ?? undefined,
    })
    applyFamily(result.family)
    toast.success(result.created ? t('admin.variant.created') : t('admin.variant.mergedExisting'))
    modalMode.value = null
  } catch (e) {
    variantError.value = apiErrorMessage(e, t('admin.variant.addError'))
  } finally {
    variantBusy.value = false
  }
}

async function saveEdit() {
  if (!editingId.value || !family.value) return
  const sellPrice = parseAmount(modalDraft.value.sellPrice)
  const unitCost = parseAmount(modalDraft.value.unitCost)
  if (sellPrice === null || unitCost === null) {
    variantError.value = t('admin.variant.invalidAmounts')
    return
  }
  const attrs = attributesFromDraft(modalDraft.value)
  variantBusy.value = true
  variantError.value = ''
  try {
    await updateProduct(editingId.value, {
      attributes: attrs,
      unitCost,
      sellPrice,
      availableOnline: modalDraft.value.availableOnline,
      isActive: modalDraft.value.isActive,
    })
    const qty = Number(modalDraft.value.quantity)
    const current = family.value.variants.find((v) => v.id === editingId.value)
    if (Number.isInteger(qty) && qty >= 0 && qty !== (current?.shopQuantity ?? 0)) {
      if (!auth.selectedShopId) {
        variantError.value = t('admin.product.selectShopForStockChange')
        variantBusy.value = false
        return
      }
      await setVariantStock(editingId.value, auth.selectedShopId, qty)
    }
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    modalMode.value = null
    editingId.value = null
    toast.success(t('admin.variant.updated'))
  } catch (e) {
    variantError.value = apiErrorMessage(e, t('admin.variant.updateError'))
  } finally {
    variantBusy.value = false
  }
}

async function confirmDelete() {
  if (!confirmDeleteId.value || !family.value) return
  variantBusy.value = true
  error.value = ''
  try {
    await deleteProduct(confirmDeleteId.value)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    confirmDeleteId.value = null
    toast.success(t('admin.variant.deleted'))
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.variant.deleteError'))
  } finally {
    variantBusy.value = false
  }
}

async function onUpload(files: File[]) {
  if (!family.value) return
  uploading.value = true
  error.value = ''
  try {
    for (const file of files) {
      uploadPercent.value = 0
      await uploadFamilyImage(family.value.id, file, (percent) => {
        uploadPercent.value = percent
      })
    }
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    toast.success(t('admin.productImages.uploaded'))
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.productImages.uploadFailed'))
  } finally {
    uploading.value = false
    uploadPercent.value = null
  }
}

function onRemove(imageId: string) {
  confirmImageId.value = imageId
}

async function confirmRemoveImage() {
  const imageId = confirmImageId.value
  if (!family.value || !imageId) return
  try {
    await deleteFamilyImage(family.value.id, imageId)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    toast.success(t('admin.productImages.removed'))
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.productImages.removeError'))
  } finally {
    confirmImageId.value = null
  }
}

async function onSetPrimary(imageId: string) {
  if (!family.value) return
  try {
    await setPrimaryFamilyImage(family.value.id, imageId)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    toast.success(t('admin.productImages.primaryUpdated'))
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.productImages.primaryError'))
  }
}
</script>

<template>
  <div class="page-shell">
    <div v-if="loading" class="flex flex-col gap-6" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <div class="pos-skeleton h-8 w-64" />
      <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="pos-skeleton h-80 rounded-2xl" />
        <div class="pos-skeleton h-80 rounded-2xl" />
      </div>
      <div class="pos-skeleton h-56 rounded-2xl" />
    </div>

    <template v-else-if="loadError">
      <PageHeader :back="{ name: 'admin-products' }" :back-label="t('admin.products.back')" />
      <p class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        {{ loadError }}
      </p>
    </template>

    <ProductEditorShell v-else-if="family">
      <template #header>
        <PageHeader
          :title="family.name"
          :subtitle="variantSummary"
          :back="{ name: 'admin-products' }"
          :back-label="t('admin.products.back')"
        >
          <template #actions>
            <span :class="productUnavailable ? 'pos-badge-err' : 'pos-badge-ok'">
              <span class="pos-dot" />
              {{ productUnavailable ? t('admin.product.statusUnavailable') : t('admin.product.statusAvailable') }}
            </span>
            <span v-if="isDirty" class="pos-badge-warn">{{ t('admin.product.unsaved') }}</span>
            <button
              v-if="canManage"
              type="button"
              class="pos-btn-primary"
              :disabled="saving || !isDirty"
              @click="saveProduct"
            >
              <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              {{ saving ? t('common.saving') : t('admin.product.save') }}
            </button>
          </template>
        </PageHeader>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
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
          :disabled="!canManage"
          @update:name="productForm.name = $event"
          @update:description="productForm.description = $event"
          @update:available-online="productForm.availableOnline = $event"
          @update:is-active="productForm.isActive = $event"
        />
      </template>

      <template #images>
        <ProductImageManager
          :images="family.images"
          :disabled="!canManage || uploading"
          :uploading="uploading"
          :upload-percent="uploadPercent"
          @upload="onUpload"
          @remove="onRemove"
          @set-primary="onSetPrimary"
        />
      </template>

      <template #variants>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="section-title">{{ t('admin.variant.sectionTitle') }}</h2>
            <p class="mt-0.5 text-[12.5px] text-pos-muted">{{ t('admin.variant.stockEditHint') }}</p>
          </div>
          <button v-if="canManage" type="button" class="pos-btn-soft" @click="openAddVariant">
            <Plus class="h-4 w-4" />
            {{ t('admin.variant.add') }}
          </button>
        </div>
        <VariantTable
          :variants="family.variants"
          :can-manage="canManage"
          :stock-draft="stockDraft"
          :stock-state="stockState"
          @update:stock-draft="stockDraft = $event"
          @save-stock="saveStock"
          @edit="startEdit"
          @delete="confirmDeleteId = $event"
        />
      </template>

      <template #footer>
        <div v-if="canManage && isDirty" class="sticky bottom-4 z-10 flex justify-end">
          <div class="pos-surface flex items-center gap-3 p-2 ps-4" style="box-shadow: var(--pos-shadow-lg) !important">
            <span class="text-[13px] text-pos-muted">{{ t('admin.product.unsavedChanges') }}</span>
            <button type="button" class="pos-btn-ghost pos-btn-sm" @click="applyFamily(family)">{{ t('admin.product.discard') }}</button>
            <button type="button" class="pos-btn-primary pos-btn-sm" :disabled="saving" @click="saveProduct">
              {{ saving ? t('common.saving') : t('admin.product.save') }}
            </button>
          </div>
        </div>
      </template>
    </ProductEditorShell>

    <VariantModal
      v-if="modalMode"
      :title="modalMode === 'add' ? t('admin.variant.addTitle') : t('admin.variant.editTitle')"
      :model-value="modalDraft"
      :extra-colors="extraColors"
      :extra-sizes="extraSizes"
      :quantity-label="modalMode === 'edit' ? t('admin.variant.stock') : t('admin.variant.availableQuantity')"
      :submitting="variantBusy"
      :submit-label="modalMode === 'add' ? t('admin.variant.addSubmit') : t('admin.variant.saveChanges')"
      :error="variantError"
      :quantity-hint="
        modalMode === 'add'
          ? t('admin.variant.stockZeroHintAdd')
          : t('admin.variant.stockHintEdit')
      "
      @update:model-value="modalDraft = $event"
      @cancel="modalMode = null"
      @submit="submitVariant"
    />

    <AdminConfirm
      v-if="confirmDeleteId"
      :title="t('admin.variant.deleteTitle')"
      :body="t('admin.variant.confirmDelete')"
      :confirm-label="t('common.delete')"
      danger
      :busy="variantBusy"
      @close="confirmDeleteId = null"
      @confirm="confirmDelete"
    />

    <AdminConfirm
      v-if="confirmImageId"
      :title="t('admin.productImages.removeTitle')"
      :body="t('admin.productImages.confirmRemove')"
      :confirm-label="t('admin.productImages.removeAria')"
      danger
      @close="confirmImageId = null"
      @confirm="confirmRemoveImage"
    />
  </div>
</template>
