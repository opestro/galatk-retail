<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import {
  apiErrorMessage,
  createProductFamily,
  uploadFamilyImage,
  type VariantPayload,
} from '@/services/products'
import type { ProductFamily } from '@/types/api'
import VariantForm, { type VariantDraft } from './VariantForm.vue'

const props = defineProps<{
  shopId: string | null
}>()

const emit = defineEmits<{
  close: []
  created: [family: ProductFamily]
}>()

const name = ref('')
const description = ref('')
const availableOnline = ref(true)
const isActive = ref(true)
const files = ref<File[]>([])
const variants = ref<VariantDraft[]>([
  { color: '', size: '', unitCost: 0, sellPrice: 0, quantity: 0, availableOnline: true, isActive: true },
])
const submitting = ref(false)
const error = ref('')

function addVariantRow() {
  variants.value.push({
    color: '',
    size: '',
    unitCost: 0,
    sellPrice: 0,
    quantity: 0,
    availableOnline: true,
    isActive: true,
  })
}

function removeVariantRow(index: number) {
  variants.value.splice(index, 1)
}

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  files.value = [...files.value, ...Array.from(input.files ?? [])]
  input.value = ''
}

function toPayload(draft: VariantDraft): VariantPayload | null {
  const attrs: Record<string, string> = {}
  if (draft.color.trim()) attrs.color = draft.color.trim()
  if (draft.size.trim()) attrs.size = draft.size.trim()
  if (!attrs.color && !attrs.size) return null
  const sellPrice = Number(draft.sellPrice)
  const unitCost = Number(draft.unitCost)
  const quantity = Number(draft.quantity)
  if (!Number.isFinite(sellPrice) || sellPrice < 0 || !Number.isFinite(unitCost) || unitCost < 0) return null
  if (!Number.isInteger(quantity) || quantity < 0) return null
  return {
    attributes: attrs,
    unitCost,
    sellPrice,
    quantity,
    availableOnline: draft.availableOnline,
    isActive: draft.isActive,
  }
}

async function submit() {
  if (!name.value.trim()) {
    error.value = 'Product name is required'
    return
  }
  const filled = variants.value.filter((row) => row.color.trim() || row.size.trim())
  const payload = filled.map(toPayload)
  if (payload.some((row) => row === null)) {
    error.value = 'Each variant needs a valid color/size, cost, price, and quantity ≥ 0'
    return
  }
  const rows = payload.filter((row): row is VariantPayload => row !== null)
  if (rows.some((row) => (row.quantity ?? 0) > 0) && !props.shopId) {
    error.value = 'Select a shop before adding stock'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const family = await createProductFamily({
      name: name.value.trim(),
      description: description.value,
      availableOnline: availableOnline.value,
      isActive: isActive.value,
      variants: rows,
      shopId: props.shopId ?? undefined,
    })
    for (const file of files.value) {
      await uploadFamilyImage(family.id, file)
    }
    emit('created', family)
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not create product')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" @click.self="emit('close')">
    <div class="w-full max-w-3xl rounded-lg border border-gray-200 bg-white">
      <header class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 class="text-lg font-semibold text-gray-900">Create product</h2>
        <button type="button" class="rounded-md p-2 text-gray-500 hover:bg-gray-50" aria-label="Close" @click="emit('close')">
          <X class="h-5 w-5" />
        </button>
      </header>
      <div class="flex flex-col gap-4 p-5">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <label class="flex flex-col gap-1 text-sm">
          Product name
          <input v-model="name" class="input" placeholder="Baggy" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Description
          <textarea v-model="description" class="input min-h-24" placeholder="Oversized casual trousers…" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Images
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="text-sm" @change="onFiles" />
          <span v-if="files.length" class="text-xs text-gray-500">{{ files.length }} file(s) selected</span>
        </label>
        <div class="flex gap-4">
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="availableOnline" type="checkbox" class="size-4 rounded border-gray-300" />
            Available online
          </label>
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="isActive" type="checkbox" class="size-4 rounded border-gray-300" />
            Active
          </label>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800">Variants</h3>
            <button type="button" class="text-sm text-gray-700 underline" @click="addVariantRow">+ Add variant</button>
          </div>
          <div v-for="(row, index) in variants" :key="index" class="mb-3 rounded-md border border-gray-200 p-3">
            <VariantForm v-model="variants[index]!" />
            <button
              v-if="variants.length > 1"
              type="button"
              class="mt-2 text-xs text-red-600 underline"
              @click="removeVariantRow(index)"
            >
              Remove row
            </button>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="submitting" @click="emit('close')">Cancel</button>
          <button type="button" class="btn-primary" :disabled="submitting" @click="submit">
            {{ submitting ? 'Creating…' : 'Create product' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
