<script setup lang="ts">
defineProps<{
  name: string
  description: string
  availableOnline: boolean
  isActive: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:description': [value: string]
  'update:availableOnline': [value: boolean]
  'update:isActive': [value: boolean]
}>()
</script>

<template>
  <div class="flex h-full flex-col gap-5">
    <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
      Product name
      <input
        class="input text-base"
        :value="name"
        :disabled="disabled"
        maxlength="120"
        placeholder="Cotton"
        @input="emit('update:name', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
      Description
      <textarea
        class="input min-h-36 resize-y"
        :value="description"
        :disabled="disabled"
        maxlength="4000"
        placeholder="Add a product description to help customers understand this product."
        @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>

    <div class="flex flex-col gap-3 border-t border-gray-100 pt-4">
      <h4 class="text-sm font-semibold text-gray-800">Visibility</h4>
      <label class="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          class="mt-0.5 size-4 rounded border-gray-300"
          :checked="availableOnline"
          :disabled="disabled"
          @change="emit('update:availableOnline', ($event.target as HTMLInputElement).checked)"
        />
        <span>
          <span class="font-medium">Available online</span>
          <span class="mt-0.5 block text-xs font-normal text-gray-500">This product can appear in the customer store.</span>
        </span>
      </label>
      <label class="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          class="mt-0.5 size-4 rounded border-gray-300"
          :checked="isActive"
          :disabled="disabled"
          @change="emit('update:isActive', ($event.target as HTMLInputElement).checked)"
        />
        <span>
          <span class="font-medium">Active</span>
          <span class="mt-0.5 block text-xs font-normal text-gray-500">This product is active in the system.</span>
        </span>
      </label>
    </div>
  </div>
</template>
