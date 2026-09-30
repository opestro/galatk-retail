<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from 'lucide-vue-next'
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
  <div class="page-shell max-w-6xl overflow-x-hidden">
    <button
      type="button"
      class="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      @click="goBack"
    >
      <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      {{ t('admin.products.back') }}
    </button>

    <ProductEditorShell>
      <template #header>
        <PageHeader :title="t('admin.productCreate.title')">
          <template #actions>
            <button type="button" class="btn-primary" :disabled="submitting" @click="createProduct">
              {{ submitting ? t('admin.productCreate.creating') : t('admin.productCreate.create') }}
            </button>
          </template>
        </PageHeader>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
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
          <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ t('admin.variant.sectionTitle') }}</h3>
          <button type="button" class="btn-secondary" @click="openAddVariant">{{ t('admin.variant.add') }}</button>
        </div>

        <div class="overflow-auto rounded-lg border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-start text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th class="px-4 py-2">{{ t('admin.variant.color') }}</th>
                <th class="px-4 py-2">{{ t('admin.variant.size') }}</th>
                <th class="px-4 py-2">{{ t('admin.variant.cost') }}</th>
                <th class="px-4 py-2">{{ t('admin.variant.price') }}</th>
                <th class="px-4 py-2">{{ t('admin.variant.stock') }}</th>
                <th class="px-4 py-2">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-if="variants.length === 0">
                <td colspan="6" class="px-4 py-10 text-center text-gray-500">
                  {{ t('admin.variant.empty') }}
                  <button type="button" class="mt-2 block w-full text-sm text-gray-800 underline" @click="openAddVariant">
                    {{ t('admin.variant.addPlain') }}
                  </button>
                </td>
              </tr>
              <tr v-for="(variant, index) in variants" :key="index">
                <td class="px-4 py-3 font-medium text-gray-900">{{ variant.color || t('common.emDash') }}</td>
                <td class="px-4 py-3">{{ variant.size || t('common.emDash') }}</td>
                <td class="px-4 py-3 tabular-nums">{{ variant.unitCost }}</td>
                <td class="px-4 py-3 tabular-nums">{{ variant.sellPrice }}</td>
                <td class="px-4 py-3 tabular-nums">{{ variant.quantity }}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <button type="button" class="text-sm text-gray-700 underline" @click="openEditVariant(index)">
                      {{ t('common.edit') }}
                    </button>
                    <button
                      type="button"
                      class="text-sm text-red-600 underline"
                      @click="variants = variants.filter((_, i) => i !== index)"
                    >
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="submitting" @click="goBack">{{ t('common.cancel') }}</button>
          <button type="button" class="btn-primary" :disabled="submitting" @click="createProduct">
            {{ submitting ? t('admin.productCreate.creating') : t('admin.productCreate.create') }}
          </button>
        </div>
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
      @cancel="modalOpen = false"
      @submit="saveDraftVariant"
    />
  </div>
</template>
