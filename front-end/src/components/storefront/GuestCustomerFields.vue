<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Loader2 } from 'lucide-vue-next'
import { lookupCustomerByPhone } from '@/services/globalStore'
import { ALGERIA_WILAYAS } from '@/data/algeriaWilayas'
import type { GuestCustomerFields } from '@/utils/guestCheckout'

const props = defineProps<{
  modelValue: GuestCustomerFields
  errors?: { name: string; phone: string; wilaya: string }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: GuestCustomerFields]
  'lookup': [hasPassword: boolean]
}>()

const lookupStatus = ref<'idle' | 'loading' | 'found' | 'not-found'>('idle')
const returningAccount = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function patch(partial: Partial<GuestCustomerFields>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

watch(
  () => props.modelValue.customerPhone,
  (phone) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (!phone?.trim() || phone.trim().length < 6) {
      lookupStatus.value = 'idle'
      returningAccount.value = false
      emit('lookup', false)
      return
    }
    lookupStatus.value = 'loading'
    debounceTimer = setTimeout(async () => {
      const result = await lookupCustomerByPhone(phone)
      if (result) {
        emit('update:modelValue', {
          ...props.modelValue,
          customerName: result.name,
          customerPhone: phone,
          customerWilaya: result.wilaya || props.modelValue.customerWilaya,
        })
        returningAccount.value = Boolean(result.hasPassword)
        emit('lookup', Boolean(result.hasPassword))
        lookupStatus.value = 'found'
        setTimeout(() => {
          if (lookupStatus.value === 'found') lookupStatus.value = 'idle'
        }, 2000)
      } else {
        returningAccount.value = false
        emit('lookup', false)
        lookupStatus.value = 'not-found'
        setTimeout(() => {
          if (lookupStatus.value === 'not-found') lookupStatus.value = 'idle'
        }, 2000)
      }
    }, 500)
  },
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1.5">
      <span class="text-sm text-gray-700">Full name</span>
      <input
        :value="modelValue.customerName"
        type="text"
        autocomplete="name"
        class="input"
        @input="patch({ customerName: ($event.target as HTMLInputElement).value })"
      />
      <p v-if="errors?.name" class="text-xs text-red-600">{{ errors.name }}</p>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-sm text-gray-700">Phone number</span>
      <div class="relative">
        <input
          :value="modelValue.customerPhone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="05XXXXXXXX"
          class="input"
          @input="patch({ customerPhone: ($event.target as HTMLInputElement).value })"
        />
        <Loader2
          v-if="lookupStatus === 'loading'"
          class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
        />
        <Check
          v-else-if="lookupStatus === 'found'"
          class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600"
        />
      </div>
      <p v-if="lookupStatus === 'found'" class="text-xs text-green-600">Welcome back — details filled in.</p>
      <p v-if="errors?.phone" class="text-xs text-red-600">{{ errors.phone }}</p>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-sm text-gray-700">Wilaya</span>
      <select
        :value="modelValue.customerWilaya"
        class="input"
        @change="patch({ customerWilaya: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">Select wilaya</option>
        <option v-for="wilaya in ALGERIA_WILAYAS" :key="wilaya" :value="wilaya">{{ wilaya }}</option>
      </select>
      <p v-if="errors?.wilaya" class="text-xs text-red-600">{{ errors.wilaya }}</p>
    </label>
  </div>
</template>
