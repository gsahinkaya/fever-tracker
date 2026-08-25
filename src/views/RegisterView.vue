<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const birthDate = ref('')
const inviteCode = ref('')
const loading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  const code = route.query.kod
  if (typeof code === 'string') inviteCode.value = code.toUpperCase()
})

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  if (code === 'auth/email-already-in-use') return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.'
  if (code === 'auth/weak-password') return 'Şifre en az 6 karakter olmalı.'
  if (code === 'auth/invalid-email') return 'Geçerli bir e-posta gir.'
  const message = (err as Error)?.message
  return message && !message.startsWith('Firebase:') ? message : 'Kayıt sırasında bir sorun oluştu, tekrar dene.'
}

async function submit() {
  errorMessage.value = ''
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Şifreler eşleşmiyor.'
    return
  }
  loading.value = true
  try {
    await authStore.register({
      email: email.value,
      password: password.value,
      phone: phone.value || undefined,
      birthDate: birthDate.value || undefined,
      inviteCode: inviteCode.value || undefined,
    })
    router.push('/cocuklar')
  } catch (err) {
    errorMessage.value = friendlyError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="py-8" style="max-width: 420px">
    <div class="text-center mb-8">
      <v-icon icon="mdi-baby-face-outline" size="48" color="primary" />
      <h1 class="text-h5 mt-2">Hesap Oluştur</h1>
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
      <v-text-field v-model="phone" label="Telefon (opsiyonel)" type="tel" variant="outlined" density="comfortable" />
      <v-text-field
        v-model="password"
        label="Şifre"
        type="password"
        variant="outlined"
        density="comfortable"
        required
      />
      <v-text-field
        v-model="confirmPassword"
        label="Şifre (tekrar)"
        type="password"
        variant="outlined"
        density="comfortable"
        required
      />
      <v-text-field
        v-model="birthDate"
        type="date"
        label="Doğum tarihin (opsiyonel)"
        variant="outlined"
        density="comfortable"
      />
      <v-text-field
        v-model="inviteCode"
        label="Davet kodu (varsa)"
        hint="Bir aile üyesi seni davet ettiyse buraya kodu gir"
        persistent-hint
        variant="outlined"
        density="comfortable"
        class="mb-4"
      />

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable" class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-btn type="submit" block size="large" color="primary" :loading="loading" class="mt-2">Kayıt Ol</v-btn>
    </v-form>

    <div class="text-center mt-6">
      <span class="text-medium-emphasis">Zaten hesabın var mı?</span>
      <v-btn variant="text" color="primary" to="/giris">Giriş yap</v-btn>
    </div>
  </v-container>
</template>
