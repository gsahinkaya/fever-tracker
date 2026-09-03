<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AlfredLogo from '@/components/AlfredLogo.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch {
    errorMessage.value = t('auth.login.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="py-8" style="max-width: 420px">
    <div class="text-center mb-8">
      <h1><AlfredLogo :height="56" /></h1>
    </div>

    <v-form @submit.prevent="submit">
      <v-text-field
        v-model="email"
        :label="t('auth.login.emailLabel')"
        type="email"
        variant="outlined"
        density="comfortable"
        autofocus
        required
      />
      <v-text-field
        v-model="password"
        :label="t('auth.login.passwordLabel')"
        type="password"
        variant="outlined"
        density="comfortable"
        required
      />

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable" class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-btn type="submit" block size="large" color="primary" :loading="loading">{{
        t('auth.login.submit')
      }}</v-btn>
    </v-form>

    <div class="text-center mt-6">
      <span class="text-medium-emphasis">{{ t('auth.login.noAccount') }}</span>
      <v-btn variant="text" color="primary" to="/kayit">{{ t('auth.login.registerLink') }}</v-btn>
    </div>

    <p class="text-body-2 text-medium-emphasis text-center mt-8">
      {{ t('auth.login.intro') }}
    </p>
  </v-container>
</template>
