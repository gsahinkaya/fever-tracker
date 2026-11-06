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

const forgotDialog = ref(false)
const resetEmail = ref('')
const resetLoading = ref(false)
const resetSuccess = ref(false)
const resetError = ref('')

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

function openForgotPassword() {
  resetEmail.value = email.value
  resetSuccess.value = false
  resetError.value = ''
  forgotDialog.value = true
}

async function handleResetPassword() {
  const targetEmail = resetEmail.value.trim()
  if (!targetEmail) return
  resetError.value = ''
  resetSuccess.value = false
  resetLoading.value = true
  try {
    await authStore.resetPassword(targetEmail)
    resetSuccess.value = true
  } catch {
    resetError.value = t('auth.login.forgotPasswordError')
  } finally {
    resetLoading.value = false
  }
}
</script>

<template>
  <v-container class="py-8" style="max-width: 420px">
    <div class="text-center mb-8">
      <h1><AlfredLogo :height="72" /></h1>
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

      <div class="d-flex justify-end mt-n2 mb-2">
        <v-btn
          variant="plain"
          size="small"
          class="text-caption px-0"
          color="primary"
          @click="openForgotPassword"
        >
          {{ t('auth.login.forgotPasswordLink') }}
        </v-btn>
      </div>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable" class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-btn type="submit" block size="large" color="primary" :loading="loading">{{
        t('auth.login.submit')
      }}</v-btn>
    </v-form>

    <div class="text-center mt-6">
      <span class="text-medium-emphasis">{{ t('auth.login.noAccount') }}</span>
      <v-btn variant="text" color="primary" to="/register">{{ t('auth.login.registerLink') }}</v-btn>
    </div>

    <p class="text-body-2 text-medium-emphasis text-center mt-8">
      {{ t('auth.login.intro') }}
    </p>

    <div class="text-center mt-4">
      <v-btn variant="text" size="small" color="medium-emphasis" to="/privacy">
        {{ t('settings.privacyPolicy') }}
      </v-btn>
    </div>

    <v-dialog v-model="forgotDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6 pt-4 px-4">
          {{ t('auth.login.forgotPasswordTitle') }}
        </v-card-title>
        <v-card-text class="px-4 pt-2">
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ t('auth.login.forgotPasswordDesc') }}
          </p>

          <v-form @submit.prevent="handleResetPassword">
            <v-text-field
              v-model="resetEmail"
              :label="t('auth.login.emailLabel')"
              type="email"
              variant="outlined"
              density="comfortable"
              autofocus
              required
              :disabled="resetLoading || resetSuccess"
            />

            <v-alert
              v-if="resetSuccess"
              type="success"
              variant="tonal"
              density="comfortable"
              class="mb-3"
            >
              {{ t('auth.login.forgotPasswordSuccess') }}
            </v-alert>

            <v-alert
              v-if="resetError"
              type="error"
              variant="tonal"
              density="comfortable"
              class="mb-3"
            >
              {{ resetError }}
            </v-alert>

            <v-card-actions class="px-0 pt-2 pb-0">
              <v-spacer />
              <v-btn
                v-if="!resetSuccess"
                variant="text"
                :disabled="resetLoading"
                @click="forgotDialog = false"
              >
                {{ t('common.cancel') }}
              </v-btn>
              <v-btn
                v-if="!resetSuccess"
                color="primary"
                variant="flat"
                type="submit"
                :loading="resetLoading"
                :disabled="!resetEmail.trim()"
              >
                {{ t('auth.login.forgotPasswordSubmit') }}
              </v-btn>
              <v-btn
                v-else
                color="primary"
                variant="flat"
                @click="forgotDialog = false"
              >
                {{ t('common.ok') }}
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>
