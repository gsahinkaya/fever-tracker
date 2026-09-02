<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyMembers } from '@/composables/useFamilyMembers'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useGrowthLogStore } from '@/stores/growthLog'
import { useSymptomLogStore } from '@/stores/symptomLog'
import { useSleepLogStore } from '@/stores/sleepLog'
import { useDiaperLogStore } from '@/stores/diaperLog'
import { useChildrenStore } from '@/stores/children'
import { useMedicationsStore } from '@/stores/medications'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const feverLogStore = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()
const growthLogStore = useGrowthLogStore()
const symptomLogStore = useSymptomLogStore()
const sleepLogStore = useSleepLogStore()
const diaperLogStore = useDiaperLogStore()
const childrenStore = useChildrenStore()
const medicationsStore = useMedicationsStore()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()

const inviteLink = computed(() =>
  authStore.familyId ? `${window.location.origin}/kayit?kod=${authStore.familyId}` : '',
)
const copied = ref(false)

const { members: familyMembers, load: loadFamilyMembers } = useFamilyMembers()
watch(() => authStore.familyId, loadFamilyMembers, { immediate: true })

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Clipboard API can be unavailable (e.g. insecure context); the code/link is still visible to copy manually.
  }
}

const activeChildName = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId)?.name ?? '',
)
const showClearConfirm = ref(false)

async function clearAll() {
  await Promise.all([
    feverLogStore.clearAllEntries(),
    feedingLogStore.clearAllEntries(),
    growthLogStore.clearAllEntries(),
    symptomLogStore.clearAllEntries(),
    sleepLogStore.clearAllEntries(),
    diaperLogStore.clearAllEntries(),
  ])
  showClearConfirm.value = false
}

async function logout() {
  await authStore.logout()
  router.push('/giris')
}
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('settings.title') }}</span>
    </div>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">{{ t('settings.appearance') }}</v-card-title>
      <v-card-text>
        <v-btn-toggle
          :model-value="themeStore.mode"
          color="primary"
          variant="outlined"
          density="comfortable"
          mandatory
          @update:model-value="themeStore.setMode"
        >
          <v-btn value="light" prepend-icon="mdi-white-balance-sunny">{{
            t('settings.lightMode')
          }}</v-btn>
          <v-btn value="dark" prepend-icon="mdi-weather-night">{{
            t('settings.darkMode')
          }}</v-btn>
        </v-btn-toggle>
      </v-card-text>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">{{ t('settings.language') }}</v-card-title>
      <v-card-text>
        <v-btn-toggle
          :model-value="localeStore.locale"
          color="primary"
          variant="outlined"
          density="comfortable"
          mandatory
          @update:model-value="localeStore.setLocale"
        >
          <v-btn value="tr">{{ t('settings.languageTurkish') }}</v-btn>
          <v-btn value="en">{{ t('settings.languageEnglish') }}</v-btn>
        </v-btn-toggle>
      </v-card-text>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">{{ t('settings.account') }}</v-card-title>
      <v-card-text>
        <div v-if="authStore.profile?.name" class="text-body-2 font-weight-bold">
          {{ authStore.profile.name }}
        </div>
        <div class="text-body-2 text-medium-emphasis">{{ authStore.profile?.email }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="logout">{{ t('settings.logout') }}</v-btn>
      </v-card-actions>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">{{ t('settings.childrenTitle') }}</v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">
        {{ t('settings.childrenCount', { count: childrenStore.children.length }) }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" to="/cocuklar">{{ t('settings.manage') }}</v-btn>
      </v-card-actions>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">{{ t('settings.medicationsTitle') }}</v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">
        {{ t('settings.medicationsCount', { count: medicationsStore.medications.length }) }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" to="/ilaclar">{{ t('settings.manage') }}</v-btn>
      </v-card-actions>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">{{ t('settings.inviteTitle') }}</v-card-title>
      <v-card-text>
        <template v-if="familyMembers.length">
          <p class="text-caption text-medium-emphasis text-uppercase mb-1">
            {{ t('settings.membersTitle') }}
          </p>
          <v-list density="compact" class="mb-4 pa-0">
            <v-list-item v-for="member in familyMembers" :key="member.uid" class="px-0">
              <template #prepend>
                <v-avatar color="primary" size="32" class="mr-3">
                  <span class="text-body-2 text-white">{{
                    (member.name || member.email || '?').charAt(0).toUpperCase()
                  }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2 font-weight-bold">
                {{ member.name || member.email }}
                <span v-if="member.isSelf" class="text-medium-emphasis font-weight-regular">
                  ({{ t('settings.you') }})</span
                >
              </v-list-item-title>
              <v-list-item-subtitle v-if="member.name && member.email" class="text-caption">{{
                member.email
              }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </template>
        <p class="text-body-2 text-medium-emphasis mb-2">
          {{ t('settings.inviteBody') }}
        </p>
        <v-text-field
          :model-value="authStore.familyId"
          :label="t('settings.inviteCodeLabel')"
          readonly
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          :model-value="inviteLink"
          :label="t('settings.inviteLinkLabel')"
          readonly
          variant="outlined"
          density="comfortable"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          :append-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
          @click="copyInvite"
        >
          {{ copied ? t('settings.copied') : t('settings.copyLink') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-if="activeChildName" variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1 text-error">{{ t('settings.dangerZone') }}</v-card-title>
      <v-card-text>
        {{ t('settings.dangerZoneBody', { name: activeChildName }) }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="error" variant="text" @click="showClearConfirm = true">
          {{ t('settings.deleteRecordsButton', { name: activeChildName }) }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <p class="text-caption text-medium-emphasis text-center">
      {{ t('settings.footer') }}
    </p>

    <v-dialog v-model="showClearConfirm" max-width="360">
      <v-card>
        <v-card-title class="text-h6">{{ t('settings.confirmDialog.title') }}</v-card-title>
        <v-card-text>{{ t('settings.confirmDialog.body', { name: activeChildName }) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showClearConfirm = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="clearAll">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
