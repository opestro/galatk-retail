<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  name: string
  description: string
  availableOnline: boolean
  isActive: boolean
  disabled?: boolean
}>()

const { t } = useI18n()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:description': [value: string]
  'update:availableOnline': [value: boolean]
  'update:isActive': [value: boolean]
}>()
</script>

<template>
  <div class="flex h-full flex-col gap-5">
    <div class="pos-field">
      <label for="product-name" class="pos-label">{{ t('admin.product.name') }}</label>
      <input
        id="product-name"
        class="pos-input"
        :value="props.name"
        :disabled="disabled"
        maxlength="120"
        :placeholder="t('admin.product.namePlaceholder')"
        @input="emit('update:name', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="pos-field">
      <div class="flex items-center justify-between">
        <label for="product-description" class="pos-label">{{ t('admin.product.description') }}</label>
        <span class="text-[11.5px] text-pos-faint pos-num">{{ props.description.length }}/4000</span>
      </div>
      <textarea
        id="product-description"
        class="pos-input h-auto min-h-36 resize-y py-3 leading-relaxed"
        :value="props.description"
        :disabled="disabled"
        maxlength="4000"
        :placeholder="t('admin.product.descriptionPlaceholder')"
        @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <div class="flex flex-col gap-1 border-t border-pos-line pt-4">
      <h3 class="pos-label pb-2">{{ t('admin.product.visibility') }}</h3>
      <div class="flex items-start justify-between gap-4 rounded-xl px-1 py-2">
        <span>
          <span id="product-online-label" class="block text-[14px] font-medium text-pos-ink">{{ t('admin.product.availableOnline') }}</span>
          <span class="mt-0.5 block text-[12.5px] text-pos-muted">{{ t('admin.product.availableOnlineHint') }}</span>
        </span>
        <button
          type="button"
          role="switch"
          class="pos-switch mt-0.5"
          aria-labelledby="product-online-label"
          :aria-checked="availableOnline"
          :disabled="disabled"
          @click="emit('update:availableOnline', !availableOnline)"
        />
      </div>
      <div class="flex items-start justify-between gap-4 rounded-xl px-1 py-2">
        <span>
          <span id="product-active-label" class="block text-[14px] font-medium text-pos-ink">{{ t('admin.product.active') }}</span>
          <span class="mt-0.5 block text-[12.5px] text-pos-muted">{{ t('admin.product.activeHint') }}</span>
        </span>
        <button
          type="button"
          role="switch"
          class="pos-switch mt-0.5"
          aria-labelledby="product-active-label"
          :aria-checked="isActive"
          :disabled="disabled"
          @click="emit('update:isActive', !isActive)"
        />
      </div>
    </div>
  </div>
</template>
