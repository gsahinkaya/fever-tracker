<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { auth } from '@/firebase'

interface Exchange {
  question: string
  answer: string | null
  error: string | null
  loading: boolean
}

const question = ref('')
const exchanges = ref<Exchange[]>([])
const listEl = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  listEl.value?.scrollTo({ top: listEl.value.scrollHeight, behavior: 'smooth' })
}

async function ask() {
  const q = question.value.trim()
  if (!q) return
  question.value = ''

  const exchange: Exchange = { question: q, answer: null, error: null, loading: true }
  exchanges.value.push(exchange)
  await scrollToBottom()

  try {
    const idToken = await auth.currentUser?.getIdToken()
    const response = await fetch('/api/kido-sor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ question: q }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Yanıt alınamadı, tekrar dene.')
    exchange.answer = data.answer
  } catch (err) {
    exchange.error = err instanceof Error ? err.message : 'Yanıt alınamadı, tekrar dene.'
  } finally {
    exchange.loading = false
    await scrollToBottom()
  }
}
</script>

<template>
  <v-container class="py-4 d-flex flex-column" style="max-width: 640px; height: calc(100vh - 64px)">
    <div class="d-flex align-center mb-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        aria-label="Geri"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">Kido'ya Sor</span>
    </div>

    <div v-if="!exchanges.length" class="text-center text-medium-emphasis py-8">
      <v-icon icon="mdi-chat-question-outline" size="40" color="success" class="mb-2" />
      <p class="text-body-2">
        Ateş, ilaç ya da beslenmeyle ilgili merak ettiğin bir şeyi Kido'ya sorabilirsin.
      </p>
    </div>

    <div ref="listEl" class="flex-grow-1 overflow-y-auto mb-4">
      <div v-for="(exchange, i) in exchanges" :key="i" class="mb-4">
        <div class="d-flex justify-end mb-2">
          <v-card color="primary" variant="flat" class="pa-3" max-width="80%">
            <span class="text-body-2">{{ exchange.question }}</span>
          </v-card>
        </div>
        <div class="d-flex justify-start">
          <v-card variant="outlined" class="pa-3" max-width="80%">
            <v-progress-circular v-if="exchange.loading" indeterminate size="20" color="success" />
            <span v-else-if="exchange.error" class="text-body-2 text-error">{{
              exchange.error
            }}</span>
            <span v-else class="text-body-2" style="white-space: pre-wrap">{{
              exchange.answer
            }}</span>
          </v-card>
        </div>
      </div>
    </div>

    <v-form class="d-flex ga-2" @submit.prevent="ask">
      <v-text-field
        v-model="question"
        label="Bir şey sor..."
        variant="outlined"
        density="comfortable"
        hide-details
        autofocus
      />
      <v-btn icon="mdi-send" color="success" type="submit" :disabled="!question.trim()" />
    </v-form>

    <p class="text-caption text-medium-emphasis text-center mt-2">
      Kido bir doktorun yerini tutmaz; ciddi durumlarda mutlaka bir hekime danış.
    </p>
  </v-container>
</template>
