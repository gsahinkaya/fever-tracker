<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useFeverLogStore } from '@/stores/feverLog'

// Landed on from the "Verildi" action button of a medication push
// notification (see public/firebase-messaging-sw.js) — logs the dose with
// no further taps needed, matching the manual flow in AddReadingDialog but
// skipped straight to the write. The router guard has already ensured
// auth/family context is ready by the time this mounts.
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useFeverLogStore()

const status = ref<'saving' | 'done' | 'error'>('saving')
const medName = (route.query.medName as string) || t('quickDose.fallbackMedName')

onMounted(async () => {
  const childId = (route.query.childId as string) || null
  const medId = route.query.medId as string | undefined
  if (childId) store.watchChild(childId)

  try {
    if (!medId) throw new Error('missing medId')
    await store.addDose(medId, medName)
    status.value = 'done'
    setTimeout(() => router.replace('/'), 1600)
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <v-container
    class="d-flex flex-column align-center justify-center text-center"
    style="min-height: 60vh"
  >
    <template v-if="status === 'saving'">
      <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
      <p class="text-body-1">{{ t('quickDose.saving') }}</p>
    </template>
    <template v-else-if="status === 'done'">
      <v-icon icon="mdi-check-circle" color="success" size="56" class="mb-4" />
      <p class="text-h6">{{ t('quickDose.done', { medName }) }}</p>
    </template>
    <template v-else>
      <v-icon icon="mdi-alert-circle-outline" color="error" size="56" class="mb-4" />
      <p class="text-body-1 mb-4">{{ t('quickDose.error') }}</p>
      <v-btn color="primary" variant="flat" to="/">{{ t('quickDose.openApp') }}</v-btn>
    </template>
  </v-container>
</template>
