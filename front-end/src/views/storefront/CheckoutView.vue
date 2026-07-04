<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useStorefrontCartStore } from '@/stores/storefrontCart'
import { lookupCustomerByPhoneStorefront } from '@/services/globalStore'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import { Check, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const cart = useStorefrontCartStore()

const shop = ref<{ serviceCity: string; deliveryFee: string } | null>(null)
const loading = ref(true)
const form = ref({
  fulfillmentType: 'PICKUP' as 'PICKUP' | 'DELIVERY',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  deliveryAddress: '',
  deliveryCity: '',
})
const error = ref('')
const lookupStatus = ref<'idle' | 'loading' | 'found' | 'not-found'>('idle')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  const slug = route.params.slug as string
  try {
    const { data } = await api.get<{ data: { serviceCity: string; deliveryFee: string } }>(`/storefront/${slug}`)
    shop.value = data.data
  } finally {
    loading.value = false
  }
})

watch(
  () => form.value.customerPhone,
  (phone) => {
    if (debounceTimer) clearTimeout(debounceTimer)

    if (!phone?.trim() || phone.trim().length < 6) {
      lookupStatus.value = 'idle'
      return
    }

    lookupStatus.value = 'loading'
    debounceTimer = setTimeout(async () => {
      const slug = route.params.slug as string
      const result = await lookupCustomerByPhoneStorefront(slug, phone)
      if (result) {
        form.value.customerName = result.name
        form.value.customerEmail = result.email ?? ''
        lookupStatus.value = 'found'
        setTimeout(() => {
          if (lookupStatus.value === 'found') lookupStatus.value = 'idle'
        }, 2000)
      } else {
        lookupStatus.value = 'not-found'
        setTimeout(() => {
          if (lookupStatus.value === 'not-found') lookupStatus.value = 'idle'
        }, 2000)
      }
    }, 500)
  },
)

async function submit() {
  const slug = route.params.slug as string
  error.value = ''
  try {
    const { data } = await api.post(`/storefront/${slug}/checkout`, {
      ...form.value,
      lines: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    })
    cart.clear()
    await router.push(`/shop/${slug}/confirmation/${data.orderNumber}`)
  } catch {
    error.value = 'Checkout failed — check stock and delivery city'
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Checkout" />

    <ul class="list-panel">
      <li v-for="line in cart.lines" :key="line.productId" class="list-row">
        <span>{{ line.name }} × {{ line.quantity }}</span>
        <span>{{ (Number(line.sellPrice) * line.quantity).toFixed(2) }} DZD</span>
      </li>
    </ul>

    <SkeletonForm v-if="loading" :fields="5" />

    <form v-else class="card flex max-w-lg flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-wrap gap-6">
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input v-model="form.fulfillmentType" type="radio" value="PICKUP" />
          Pickup
        </label>
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input v-model="form.fulfillmentType" type="radio" value="DELIVERY" />
          Delivery (+{{ shop?.deliveryFee }} DZD)
        </label>
      </div>

      <input v-model="form.customerName" placeholder="Your name" required class="input" />
      <div class="relative">
        <input v-model="form.customerPhone" placeholder="Phone" required class="input" />
        <Loader2
          v-if="lookupStatus === 'loading'"
          class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
        />
        <Check
          v-else-if="lookupStatus === 'found'"
          class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600"
        />
      </div>
      <p v-if="lookupStatus === 'found'" class="-mt-2 text-xs text-green-600">
        Welcome back! Name and email auto-filled.
      </p>
      <input v-model="form.customerEmail" type="email" placeholder="Email (optional)" class="input" />

      <template v-if="form.fulfillmentType === 'DELIVERY'">
        <input v-model="form.deliveryAddress" placeholder="Delivery address" required class="input" />
        <input
          v-model="form.deliveryCity"
          :placeholder="`City (must be ${shop?.serviceCity})`"
          required
          class="input"
        />
      </template>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button type="submit" class="btn-primary w-full">
        Place order · {{ cart.total.toFixed(2) }} DZD
      </button>
    </form>
  </div>
</template>
