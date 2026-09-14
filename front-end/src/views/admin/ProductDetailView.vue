<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import type { Product, ProductFamily } from '@/types/api'
import {
  addFamilyVariant,
  apiErrorMessage,
  formatMarginPercent,
  getProductFamily,
  setVariantStock,
  updateProduct,
  updateProductFamily,
  uploadFamilyImage,
  deleteFamilyImage,
  deleteProduct,
  familyInStock,
  variantInStock,
} from '@/services/products'
import { useAuthStore } from '@/stores/auth'
import { variantDisplay } from '@/utils/productFamily'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import ProductImages from '@/components/admin/products/ProductImages.vue'
import VariantForm, { type VariantDraft } from '@/components/admin/products/VariantForm.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const familyId = computed(() => String(route.params.familyId))
const canManage = computed(() => auth.isManager)

const family = ref<ProductFamily | null>(null)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const adding = ref(false)
const feedback = ref('')
const error = ref('')
const editingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const uploading = ref(false)
const stockDraft = ref<Record<string, string>>({})
const stockState = ref<Record<string, 'idle' | 'saving' | 'error'>>({})

const productUnavailable = computed(() => family.value != null && !familyInStock(family.value))

const productForm = reactive({
  name: '',
  description: '',
  availableOnline: true,
  isActive: true,
})

const extraColors = computed(() =>
  (family.value?.variants ?? []).map((v) => v.attributes?.color).filter((v): v is string => Boolean(v)),
)
const extraSizes = computed(() =>
  (family.value?.variants ?? []).map((v) => v.attributes?.size).filter((v): v is string => Boolean(v)),
)

function emptyDraft(): VariantDraft {
  return {
    color: '',
    size: '',
    unitCost: 0,
    sellPrice: 0,
    quantity: 0,
    availableOnline: true,
    isActive: true,
  }
}

const newVariant = ref<VariantDraft>(emptyDraft())
const editDraft = ref<VariantDraft>(emptyDraft())

function applyFamily(next: ProductFamily) {
  family.value = next
  productForm.name = next.name
  productForm.description = next.description ?? ''
  productForm.availableOnline = next.availableOnline
  productForm.isActive = next.isActive
  for (const variant of next.variants) {
    stockDraft.value[variant.id] = String(variant.shopQuantity ?? 0)
  }
}

async function loadFamily() {
  loading.value = true
  loadError.value = ''
  try {
    applyFamily(await getProductFamily(familyId.value, auth.selectedShopId ?? undefined))
  } catch (e) {
    loadError.value = apiErrorMessage(e, 'Product not found')
    family.value = null
  } finally {
    loading.value = false
  }
}

watch([familyId, () => auth.selectedShopId], loadFamily, { immediate: true })

function attributesFrom(draft: VariantDraft): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (draft.color.trim()) attrs.color = draft.color.trim()
  if (draft.size.trim()) attrs.size = draft.size.trim()
  return attrs
}

function parseAmount(raw: number | string): number | null {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

async function saveStock(variant: Product) {
  if (!canManage.value) return
  const shopId = auth.selectedShopId
  if (!shopId) {
    error.value = 'Select a shop before changing stock'
    return
  }
  const parsed = Number(stockDraft.value[variant.id])
  if (!Number.isInteger(parsed) || parsed < 0) {
    stockDraft.value[variant.id] = String(variant.shopQuantity ?? 0)
    error.value = 'Stock must be a whole number of 0 or more'
    return
  }
  if (parsed === (variant.shopQuantity ?? 0)) return
  stockState.value[variant.id] = 'saving'
  error.value = ''
  try {
    await setVariantStock(variant.id, shopId, parsed)
    applyFamily(await getProductFamily(familyId.value, shopId))
    feedback.value =
      parsed === 0
        ? 'Variant stock is 0 — it is now unavailable'
        : 'Stock updated'
    stockState.value[variant.id] = 'idle'
  } catch (e) {
    stockDraft.value[variant.id] = String(variant.shopQuantity ?? 0)
    stockState.value[variant.id] = 'error'
    error.value = apiErrorMessage(e, 'Could not update stock')
  }
}

async function saveProduct() {
  if (!family.value || !productForm.name.trim()) {
    error.value = 'Product name is required'
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
          name: productForm.name.trim(),
          description: productForm.description,
          availableOnline: productForm.availableOnline,
          isActive: productForm.isActive,
        },
        auth.selectedShopId ?? undefined,
      ),
    )
    feedback.value = 'Product saved'
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not save product')
  } finally {
    saving.value = false
  }
}

async function submitNewVariant() {
  if (!family.value) return
  const attrs = attributesFrom(newVariant.value)
  if (!attrs.color && !attrs.size) {
    error.value = 'Each variant needs a color and/or size'
    return
  }
  const sellPrice = parseAmount(newVariant.value.sellPrice)
  const unitCost = parseAmount(newVariant.value.unitCost)
  const quantity = Number(newVariant.value.quantity)
  if (sellPrice === null || unitCost === null) {
    error.value = 'Cost and price must be valid amounts'
    return
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    error.value = 'Quantity must be 0 or more'
    return
  }
  if (quantity > 0 && !auth.selectedShopId) {
    error.value = 'Select a shop before adding stock'
    return
  }
  adding.value = true
  error.value = ''
  feedback.value = ''
  try {
    const result = await addFamilyVariant(family.value.id, {
      attributes: attrs,
      unitCost,
      sellPrice,
      quantity,
      availableOnline: newVariant.value.availableOnline,
      isActive: newVariant.value.isActive,
      shopId: auth.selectedShopId ?? undefined,
    })
    applyFamily(result.family)
    feedback.value = result.created
      ? 'Variant created'
      : 'That variant already existed — stock and pricing were updated'
    newVariant.value = emptyDraft()
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not add variant')
  } finally {
    adding.value = false
  }
}

function startEdit(variantId: string) {
  const variant = family.value?.variants.find((v) => v.id === variantId)
  if (!variant) return
  editingId.value = variantId
  editDraft.value = {
    color: variant.attributes?.color ?? '',
    size: variant.attributes?.size ?? '',
    unitCost: variant.unitCost,
    sellPrice: variant.sellPrice,
    quantity: 0,
    availableOnline: variant.availableOnline,
    isActive: variant.isActive,
  }
}

async function saveEdit() {
  if (!editingId.value || !family.value) return
  const sellPrice = parseAmount(editDraft.value.sellPrice)
  const unitCost = parseAmount(editDraft.value.unitCost)
  if (sellPrice === null || unitCost === null) {
    error.value = 'Cost and price must be valid amounts'
    return
  }
  const attrs = attributesFrom(editDraft.value)
  adding.value = true
  error.value = ''
  try {
    await updateProduct(editingId.value, {
      attributes: attrs,
      unitCost,
      sellPrice,
      availableOnline: editDraft.value.availableOnline,
      isActive: editDraft.value.isActive,
    })
    const qty = Number(editDraft.value.quantity)
    if (qty > 0) {
      const result = await addFamilyVariant(family.value.id, {
        attributes: attrs,
        unitCost,
        sellPrice,
        quantity: qty,
        shopId: auth.selectedShopId ?? undefined,
        availableOnline: editDraft.value.availableOnline,
        isActive: editDraft.value.isActive,
      })
      applyFamily(result.family)
    } else {
      applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    }
    editingId.value = null
    feedback.value = 'Variant updated'
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not update variant')
  } finally {
    adding.value = false
  }
}

async function confirmDelete() {
  if (!confirmDeleteId.value || !family.value) return
  adding.value = true
  error.value = ''
  try {
    await deleteProduct(confirmDeleteId.value)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    confirmDeleteId.value = null
    feedback.value = 'Variant deleted'
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not delete variant')
  } finally {
    adding.value = false
  }
}

async function onUpload(file: File) {
  if (!family.value) return
  uploading.value = true
  error.value = ''
  try {
    await uploadFamilyImage(family.value.id, file)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
    feedback.value = 'Image uploaded'
  } catch (e) {
    error.value = apiErrorMessage(e, 'Image upload failed')
  } finally {
    uploading.value = false
  }
}

async function onRemove(imageId: string) {
  if (!family.value) return
  if (!window.confirm('Remove this image?')) return
  try {
    await deleteFamilyImage(family.value.id, imageId)
    applyFamily(await getProductFamily(family.value.id, auth.selectedShopId ?? undefined))
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not remove image')
  }
}
</script>

<template>
  <div class="page-shell">
    <button
      type="button"
      class="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      @click="router.push({ name: 'admin-products' })"
    >
      <ArrowLeft class="h-4 w-4" />
      Products
    </button>

    <SkeletonForm v-if="loading" :fields="8" />

    <p v-else-if="loadError" class="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-gray-600">
      {{ loadError }}
    </p>

    <template v-else-if="family">
      <PageHeader :title="family.name">
        <template #actions>
          <span
            v-if="productUnavailable"
            class="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600"
          >
            Unavailable — all variants are out of stock
          </span>
          <span
            v-else
            class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
          >
            Available
          </span>
        </template>
      </PageHeader>

      <p v-if="feedback" class="text-sm text-green-700">{{ feedback }}</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <section class="card flex flex-col gap-3">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Product information</h3>
        <label class="flex flex-col gap-1 text-sm text-gray-700">
          Product name
          <input v-model="productForm.name" class="input" :disabled="!canManage" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-gray-700">
          Description
          <textarea v-model="productForm.description" class="input min-h-24" :disabled="!canManage" />
        </label>
        <ProductImages
          :images="family.images"
          :disabled="!canManage || uploading"
          @upload="onUpload"
          @remove="onRemove"
        />
        <div class="flex flex-wrap gap-4">
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="productForm.availableOnline" type="checkbox" class="size-4 rounded border-gray-300" :disabled="!canManage" />
            Available online
          </label>
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="productForm.isActive" type="checkbox" class="size-4 rounded border-gray-300" :disabled="!canManage" />
            Active
          </label>
        </div>
        <button
          v-if="canManage"
          type="button"
          class="btn-primary self-start"
          :disabled="saving"
          @click="saveProduct"
        >
          {{ saving ? 'Saving…' : 'Save product' }}
        </button>
      </section>

      <section class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Variants</h3>
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th class="px-4 py-2">Variant</th>
                <th class="px-4 py-2">Cost</th>
                <th class="px-4 py-2">Price</th>
                <th class="px-4 py-2">Margin</th>
                <th class="px-4 py-2">Stock</th>
                <th class="px-4 py-2">Online</th>
                <th class="px-4 py-2">Active</th>
                <th v-if="canManage" class="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="family.variants.length === 0">
                <td colspan="8" class="px-4 py-6 text-center text-gray-500">No variants yet.</td>
              </tr>
              <tr
                v-for="variant in family.variants"
                :key="variant.id"
                :class="variantInStock(variant) ? '' : 'bg-gray-50 text-gray-500'"
              >
                <td class="px-4 py-3 font-medium text-gray-900">
                  {{ variantDisplay(variant) }}
                  <span
                    v-if="variant.galatkProductRef"
                    class="ml-2 rounded-full border border-gray-300 px-2 py-0.5 text-xs font-normal text-gray-600"
                  >
                    Factory
                  </span>
                  <span
                    v-if="!variantInStock(variant)"
                    class="ml-2 rounded-full border border-gray-300 px-2 py-0.5 text-xs font-normal text-gray-600"
                  >
                    Unavailable
                  </span>
                </td>
                <td class="px-4 py-3 tabular-nums">{{ variant.unitCost }}</td>
                <td class="px-4 py-3 tabular-nums">{{ variant.sellPrice }}</td>
                <td class="px-4 py-3 tabular-nums">{{ formatMarginPercent(variant.sellPrice, variant.unitCost) }}</td>
                <td class="px-4 py-3">
                  <input
                    v-model="stockDraft[variant.id]"
                    type="number"
                    min="0"
                    step="1"
                    class="input w-24"
                    :disabled="!canManage || stockState[variant.id] === 'saving'"
                    @keydown.enter="saveStock(variant)"
                    @blur="saveStock(variant)"
                  />
                </td>
                <td class="px-4 py-3">{{ variant.availableOnline ? '✓' : '—' }}</td>
                <td class="px-4 py-3">{{ variant.isActive ? '✓' : '—' }}</td>
                <td v-if="canManage" class="px-4 py-3">
                  <div class="flex gap-2">
                    <button type="button" class="text-sm text-gray-700 underline" @click="startEdit(variant.id)">Edit</button>
                    <button type="button" class="text-sm text-red-600 underline" @click="confirmDeleteId = variant.id">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="canManage && editingId" class="card">
          <p class="mb-3 text-sm font-medium">Edit variant</p>
          <VariantForm v-model="editDraft" :extra-colors="extraColors" :extra-sizes="extraSizes" quantity-label="Add stock" />
          <p class="mt-2 text-xs text-gray-500">Quantity here adds inbound stock for the active shop; it does not overwrite inventory.</p>
          <div class="mt-3 flex gap-2">
            <button type="button" class="btn-primary" :disabled="adding" @click="saveEdit">{{ adding ? 'Saving…' : 'Save variant' }}</button>
            <button type="button" class="btn-secondary" @click="editingId = null">Cancel</button>
          </div>
        </div>

        <div v-if="canManage" class="card">
            <p class="mb-3 text-sm font-medium">Add variant</p>
            <p class="mb-3 text-xs text-gray-500">Stock 0 makes this variant unavailable until you add quantity.</p>
          <VariantForm v-model="newVariant" :extra-colors="extraColors" :extra-sizes="extraSizes" />
          <button type="button" class="btn-primary mt-3" :disabled="adding" @click="submitNewVariant">
            {{ adding ? 'Adding…' : 'Add variant' }}
          </button>
        </div>
      </section>
    </template>

    <div
      v-if="confirmDeleteId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5">
        <p class="text-sm text-gray-800">Delete this variant? This cannot be undone.</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="confirmDeleteId = null">Cancel</button>
          <button type="button" class="btn-danger" :disabled="adding" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
