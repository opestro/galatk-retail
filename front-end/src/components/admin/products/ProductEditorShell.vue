<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  informationTitle?: string
  imagesTitle?: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-6">
    <slot name="header" />

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <section class="card flex flex-col gap-5">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ informationTitle ?? t('admin.product.informationTitle') }}
        </h3>
        <slot name="information" />
      </section>

      <section class="card flex flex-col gap-4">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ imagesTitle ?? t('admin.product.imagesTitle') }}
        </h3>
        <slot name="images" />
      </section>
    </div>

    <section class="card flex flex-col gap-4">
      <slot name="variants" />
    </section>

    <slot name="footer" />
  </div>
</template>
