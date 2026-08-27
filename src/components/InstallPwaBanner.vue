<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
    {{ t('installBanner.text') }}

    <template #append>
      <v-btn size="small" variant="text" @click="install">{{ t('installBanner.addButton') }}</v-btn>
    </template>
  </v-alert>
</template>
