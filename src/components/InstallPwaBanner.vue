<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const showBanner = ref(false)
const isIos = ref(false)

onMounted(() => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  if (isStandalone) return

  isIos.value = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    showBanner.value = true
  })

  if (isIos.value) {
    showBanner.value = true
  }
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
    <span v-if="isIos">
      Ana ekrana eklemek için Safari'de paylaş
      <v-icon icon="mdi-export-variant" size="16" /> düğmesine dokun, ardından "Ana Ekrana Ekle"yi
      seç.
    </span>
    <span v-else>Kido'yu ana ekranına ekleyip tek dokunuşla açabilirsin.</span>

    <template #append>
      <v-btn v-if="!isIos" size="small" variant="text" @click="install">Ekle</v-btn>
    </template>
  </v-alert>
</template>
