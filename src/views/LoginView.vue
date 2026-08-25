<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
    errorMessage.value = 'E-posta veya şifre hatalı.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="py-8" style="max-width: 420px">
    <div class="text-center mb-8">
      <v-icon icon="mdi-baby-face-outline" size="48" color="primary" />
      <h1 class="text-h5 mt-2">Kido</h1>
    </div>

    <v-form @submit.prevent="submit">
      <v-text-field
        v-model="email"
        label="E-posta"
        type="email"
        variant="outlined"
        density="comfortable"
        autofocus
        required
      />
      <v-text-field
        v-model="password"
        label="Şifre"
        type="password"
        variant="outlined"
        density="comfortable"
        required
      />

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable" class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-btn type="submit" block size="large" color="primary" :loading="loading">Giriş Yap</v-btn>
    </v-form>

    <div class="text-center mt-6">
      <span class="text-medium-emphasis">Hesabın yok mu?</span>
      <v-btn variant="text" color="primary" to="/kayit">Kayıt ol</v-btn>
    </div>
  </v-container>
</template>
