<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import KidoLogo from '@/components/KidoLogo.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
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
  if (code === 'auth/email-already-in-use') return t('auth.register.errors.emailInUse')
  if (code === 'auth/weak-password') return t('auth.register.errors.weakPassword')
  if (code === 'auth/invalid-email') return t('auth.register.errors.invalidEmail')
  const message = (err as Error)?.message
  return message && !message.startsWith('Firebase:') ? message : t('auth.register.errors.generic')
}

async function submit() {
  errorMessage.value = ''
  if (password.value !== confirmPassword.value) {
    errorMessage.value = t('auth.register.errors.passwordMismatch')
    return
  }
  loading.value = true
  try {
    await authStore.register({
      email: email.value,
      password: password.value,
      name: name.value || undefined,
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
      <h1><KidoLogo :height="40" /></h1>
      <p class="text-subtitle-1 mt-3 mb-0">{{ t('auth.register.heading') }}</p>
    </div>

    <v-form @submit.prevent="submit">
      <v-text-field
        v-model="name"
        :label="t('auth.register.nameLabel')"
        variant="outlined"
        density="comfortable"
        autofocus
        required
      />
      <v-text-field
        v-model="email"
        :label="t('auth.register.emailLabel')"
        type="email"
        variant="outlined"
        density="comfortable"
        required
      />
      <v-text-field
        v-model="phone"
        :label="t('auth.register.phoneLabel')"
        type="tel"
        variant="outlined"
        density="comfortable"
      />
      <v-text-field
        v-model="password"
        :label="t('auth.register.passwordLabel')"
        type="password"
        variant="outlined"
        density="comfortable"
        required
      />
      <v-text-field
        v-model="confirmPassword"
        :label="t('auth.register.confirmPasswordLabel')"
        type="password"
        variant="outlined"
        density="comfortable"
        required
      />
      <v-text-field
        v-model="birthDate"
        type="date"
        :label="t('auth.register.birthDateLabel')"
        variant="outlined"
        density="comfortable"
      />
      <v-text-field
        v-model="inviteCode"
        :label="t('auth.register.inviteCodeLabel')"
        :hint="t('auth.register.inviteCodeHint')"
        persistent-hint
        variant="outlined"
        density="comfortable"
        class="mb-4"
      />

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable" class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-btn type="submit" block size="large" color="primary" :loading="loading" class="mt-2">{{
        t('auth.register.submit')
      }}</v-btn>
    </v-form>

    <div class="text-center mt-6">
      <span class="text-medium-emphasis">{{ t('auth.register.haveAccount') }}</span>
      <v-btn variant="text" color="primary" to="/giris">{{ t('auth.register.loginLink') }}</v-btn>
    </div>
  </v-container>
</template>
