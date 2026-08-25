<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const showBanner = ref(false)

onMounted(() => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  if (isStandalone) return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    showBanner.value = true
  })
})

async function install() {
  if (!deferredPrompt.value) return
  await deferredPrompt.value.prompt()
  await deferredPrompt.value.userChoice
  deferredPrompt.value = null
  showBanner.value = false
}
</script>

<template>
  <v-alert
    v-if="showBanner"
    type="info"
    variant="tonal"
    density="comfortable"
    class="mb-4"
    closable
    @click:close="showBanner = false"
  >
    Kido'yu ana ekranına ekleyip tek dokunuşla açabilirsin.

    <template #append>
      <v-btn size="small" variant="text" @click="install">Ekle</v-btn>
    </template>
  </v-alert>
</template>
