<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from 'lucide-vue-next'
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
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import ProductEditorShell from '@/components/admin/products/ProductEditorShell.vue'
import ProductInformationCard from '@/components/admin/products/ProductInformationCard.vue'
import ProductImageManager from '@/components/admin/products/ProductImageManager.vue'
import VariantTable from '@/components/admin/products/VariantTable.vue'
import VariantModal from '@/components/admin/products/VariantModal.vue'
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
const router = useRouter()
const auth = useAuthStore()

const familyId = computed(() => String(route.params.familyId))
const canManage = computed(() => auth.isManager)

const family = ref<ProductFamily | null>(null)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const variantBusy = ref(false)
const feedback = ref('')
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

function goBack() {
  router.push({ name: 'admin-products' })
}

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
  feedback.value = ''
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
    feedback.value = t('admin.product.saved')
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
    feedback.value = parsed === 0 ? t('admin.product.stockZeroFeedback') : t('admin.product.stockUpdated')
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
  feedback.value = ''
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
    feedback.value = result.created
      ? t('admin.variant.created')
      : t('admin.variant.mergedExisting')
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
    feedback.value = t('admin.variant.updated')
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
    feedback.value = t('admin.variant.deleted')
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
    feedback.value = t('admin.productImages.uploaded')
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.productImages.uploadFailed'))
  } finally {
    uploading.value = false
    uploadPercent.value = null
  }
}

async function onRemove(imageId: string) {
  if (!family.value) return
  if (!window.confirm(t('admin.productImages.confirmRemove'))) return
  try {
    await deleteFamilyImage(family.value.id, imageId)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.productImages.removeError'))
  }
}

async function onSetPrimary(imageId: string) {
  if (!family.value) return
  try {
    await setPrimaryFamilyImage(family.value.id, imageId)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    feedback.value = t('admin.productImages.primaryUpdated')
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.productImages.primaryError'))
  }
}
</script>

<template>
  <div class="page-shell max-w-6xl overflow-x-hidden">
    <button
      type="button"
      class="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      @click="goBack"
    >
      <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      {{ t('admin.products.back') }}
    </button>

    <SkeletonForm v-if="loading" :fields="8" />

    <p v-else-if="loadError" class="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-gray-600">
      {{ loadError }}
    </p>

    <ProductEditorShell v-else-if="family">
      <template #header>
        <PageHeader :title="family.name">
          <template #actions>
            <span
              class="rounded-full border px-3 py-1 text-sm"
              :class="productUnavailable ? 'border-gray-300 text-gray-600' : 'border-gray-200 bg-gray-50 text-gray-700'"
            >
              {{ productUnavailable ? t('admin.product.statusUnavailable') : t('admin.product.statusAvailable') }}
            </span>
            <button
              v-if="canManage"
              type="button"
              class="btn-primary"
              :disabled="saving"
              @click="saveProduct"
            >
              {{ saving ? t('common.saving') : t('admin.product.save') }}
            </button>
          </template>
        </PageHeader>
        <p v-if="feedback" class="text-sm text-green-700">{{ feedback }}</p>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
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
          <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ t('admin.variant.sectionTitle') }}</h3>
          <button v-if="canManage" type="button" class="btn-secondary" @click="openAddVariant">{{ t('admin.variant.add') }}</button>
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
        <div v-if="canManage" class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn-secondary" @click="goBack">{{ t('common.cancel') }}</button>
          <button type="button" class="btn-primary" :disabled="saving" @click="saveProduct">
            {{ saving ? t('common.saving') : t('admin.product.save') }}
          </button>
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

    <div
      v-if="confirmDeleteId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5">
        <p class="text-sm text-gray-800">{{ t('admin.variant.confirmDelete') }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="confirmDeleteId = null">{{ t('common.cancel') }}</button>
          <button type="button" class="btn-danger" :disabled="variantBusy" @click="confirmDelete">{{ t('common.delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
