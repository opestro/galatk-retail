<script setup lang="ts">
defineProps<{
  informationTitle?: string
  imagesTitle?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <slot name="header" />

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <section class="card flex flex-col gap-5">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ informationTitle ?? 'Product information' }}
        </h3>
        <slot name="information" />
      </section>

      <section class="card flex flex-col gap-4">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ imagesTitle ?? 'Product images' }}
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
