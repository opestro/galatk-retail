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
      <section class="pos-surface flex flex-col gap-5 p-6">
        <h2 class="section-title">{{ informationTitle ?? t('admin.product.informationTitle') }}</h2>
        <slot name="information" />
      </section>

      <section class="pos-surface flex flex-col gap-4 p-6">
        <h2 class="section-title">{{ imagesTitle ?? t('admin.product.imagesTitle') }}</h2>
        <slot name="images" />
      </section>
    </div>

    <section class="pos-surface flex flex-col gap-4 p-6">
      <slot name="variants" />
    </section>

    <slot name="footer" />
  </div>
</template>
