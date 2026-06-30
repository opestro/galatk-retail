<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  getClient,
  updateClient,
  getClientLedger,
  recordClientPayment,
  voidClientPayment,
  createClientAdjustment,
} from '@/services/clientApi'
import type { Client, ClientLedgerEntry } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const route = useRoute()
const auth = useAuthStore()
const clientId = computed(() => route.params.clientId as string)

const client = ref<Client | null>(null)
const ledger = ref<ClientLedgerEntry[]>([])
const loading = ref(true)
const editing = ref(false)
const showPayment = ref(false)
const message = ref('')
const error = ref('')

const editForm = ref({ name: '', phone: '', email: '', address: '', notes: '', creditLimit: '' as string | number, isActive: true })
const paymentForm = ref({ amount: 0, paymentMethod: 'CASH' as 'CASH' | 'CARD' })
const adjustmentForm = ref({ amount: 0, note: '' })

async function load() {
  loading.value = true
  try {
    const [clientRes, ledgerRes] = await Promise.all([
      getClient(clientId.value),
      getClientLedger(clientId.value),
    ])
    client.value = clientRes.data.data
    ledger.value = ledgerRes.data.data
    editForm.value = {
      name: client.value.name,
      phone: client.value.phone,
      email: client.value.email ?? '',
      address: client.value.address ?? '',
      notes: client.value.notes ?? '',
      creditLimit: client.value.creditLimit ?? '',
      isActive: client.value.isActive,
    }
  } finally {
    loading.value = false
  }
}

async function saveClient() {
  if (!auth.isManager || !client.value) return
  const body: Record<string, unknown> = {
    name: editForm.value.name,
    phone: editForm.value.phone,
    email: editForm.value.email || null,
    address: editForm.value.address || null,
    notes: editForm.value.notes || null,
    isActive: editForm.value.isActive,
  }
  if (editForm.value.creditLimit === '') {
    body.creditLimit = null
  } else {
    body.creditLimit = Number(editForm.value.creditLimit)
  }
  await updateClient(clientId.value, body)
  editing.value = false
  message.value = 'Client updated'
  await load()
}

async function submitPayment() {
  const shopId = auth.selectedShopId
  if (!shopId || !client.value) return
  error.value = ''
  try {
    await recordClientPayment(shopId, clientId.value, {
      amount: paymentForm.value.amount,
      paymentMethod: paymentForm.value.paymentMethod,
    })
    showPayment.value = false
    paymentForm.value = { amount: 0, paymentMethod: 'CASH' }
    message.value = 'Payment recorded'
    await load()
  } catch {
    error.value = 'Payment failed'
  }
}

async function voidPayment(paymentId: string) {
  const shopId = auth.selectedShopId
  if (!shopId || !auth.isManager) return
  await voidClientPayment(shopId, clientId.value, paymentId)
  message.value = 'Payment voided'
  await load()
}

async function submitAdjustment() {
  if (!auth.isManager) return
  await createClientAdjustment(clientId.value, {
    amount: adjustmentForm.value.amount,
    note: adjustmentForm.value.note || undefined,
  })
  adjustmentForm.value = { amount: 0, note: '' }
  message.value = 'Adjustment recorded'
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="client?.name ?? 'Client profile'">
      <template #actions>
        <button class="btn-primary" @click="showPayment = true">Record payment</button>
        <button v-if="auth.isManager" class="btn-secondary" @click="editing = !editing">
          {{ editing ? 'Cancel edit' : 'Edit client' }}
        </button>
      </template>
    </PageHeader>

    <SkeletonForm v-if="loading" :fields="4" />

    <template v-else-if="client">
      <div class="grid gap-6 md:grid-cols-3">
        <div class="card">
          <p class="text-sm text-gray-500">Balance</p>
          <p class="mt-2 text-2xl font-semibold">{{ client.balance }} DZD</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">Credit limit</p>
          <p class="mt-2 text-2xl font-semibold">{{ client.creditLimit ?? 'Unlimited' }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">Phone</p>
          <p class="mt-2 font-medium">{{ client.phone }}</p>
        </div>
      </div>

      <form v-if="editing && auth.isManager" class="card flex max-w-md flex-col gap-4" @submit.prevent="saveClient">
        <input v-model="editForm.name" class="input" />
        <input v-model="editForm.phone" class="input" />
        <input v-model="editForm.email" class="input" />
        <input v-model="editForm.address" class="input" />
        <textarea v-model="editForm.notes" class="input min-h-20" />
        <input v-model="editForm.creditLimit" type="number" placeholder="Credit limit (blank = unlimited)" class="input" />
        <label class="flex items-center gap-2 text-sm">
          <input v-model="editForm.isActive" type="checkbox" />
          Active
        </label>
        <button type="submit" class="btn-primary">Save</button>
      </form>

      <div v-if="showPayment" class="card flex max-w-md flex-col gap-4">
        <h3 class="font-medium text-gray-900">Record payment</h3>
        <input v-model.number="paymentForm.amount" type="number" min="0" step="0.01" placeholder="Amount" class="input" />
        <select v-model="paymentForm.paymentMethod" class="input">
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
        </select>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="showPayment = false">Cancel</button>
          <button class="btn-primary" @click="submitPayment">Record</button>
        </div>
      </div>

      <form v-if="auth.isManager" class="card flex max-w-md flex-col gap-4" @submit.prevent="submitAdjustment">
        <h3 class="font-medium text-gray-900">Balance adjustment</h3>
        <input v-model.number="adjustmentForm.amount" type="number" step="0.01" placeholder="Amount (+/-)" class="input" />
        <input v-model="adjustmentForm.note" placeholder="Note" class="input" />
        <button type="submit" class="btn-secondary">Apply adjustment</button>
      </form>

      <p v-if="message" class="text-sm text-green-600">{{ message }}</p>

      <div class="flex flex-col gap-4">
        <h3 class="section-title">Ledger</h3>
        <ul class="list-panel">
          <li v-for="entry in ledger" :key="entry.id" class="list-row flex-col items-start gap-1 sm:flex-row sm:items-center">
            <div>
              <p class="font-medium text-gray-900">{{ entry.type }} · {{ entry.amount }} DZD</p>
              <p class="text-sm text-gray-500">{{ new Date(entry.createdAt).toLocaleString() }}</p>
              <p v-if="entry.note" class="text-sm text-gray-500">{{ entry.note }}</p>
            </div>
            <button
              v-if="entry.paymentId && auth.isManager"
              class="btn-danger text-xs"
              @click="voidPayment(entry.paymentId)"
            >
              Void payment
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
