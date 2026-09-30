<script setup lang="ts">
import { RouterView } from 'vue-router'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
</script>

<template>
  <div class="min-h-screen bg-white">
    <header class="border-b border-gray-200">
      <div class="mx-auto flex w-full max-w-5xl items-center justify-end px-6 py-3 md:px-8">
        <LanguageSwitcher />
      </div>
    </header>
    <div class="mx-auto w-full max-w-5xl px-6 py-8 md:px-8">
      <RouterView />
    </div>
  </div>
</template>
