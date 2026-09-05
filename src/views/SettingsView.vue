<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyMembersStore } from '@/stores/familyMembers'
import { triggerEmergencyAlert } from '@/composables/useEmergencyAlert'
import type { FamilyRelation } from '@/types/family'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useGrowthLogStore } from '@/stores/growthLog'
import { useSymptomLogStore } from '@/stores/symptomLog'
import { useSleepLogStore } from '@/stores/sleepLog'
import { useDiaperLogStore } from '@/stores/diaperLog'
import { useCalendarEventsStore } from '@/stores/calendarEvents'
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
const calendarEventsStore = useCalendarEventsStore()
const childrenStore = useChildrenStore()
const medicationsStore = useMedicationsStore()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()

const inviteLink = computed(() =>
  authStore.familyId ? `${window.location.origin}/kayit?kod=${authStore.familyId}` : '',
)
const copied = ref(false)

const familyMembersStore = useFamilyMembersStore()

const showEmergencyConfirm = ref(false)
function confirmEmergency() {
  showEmergencyConfirm.value = false
  triggerEmergencyAlert()
}

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

// Mirrors firestore.rules: only the owner may remove a member, and only
// once they've actually declared themselves a parent — matters here mainly
// because `relation` is optional and accounts created before it existed
// (or anyone who skipped it) don't have one set yet.
const isFamilyOwner = computed(
  () =>
    !!authStore.user &&
    familyMembersStore.ownerUid === authStore.user.uid &&
    (authStore.profile?.relation === 'mother' || authStore.profile?.relation === 'father'),
)

const removeMemberTarget = ref<{ uid: string; label: string } | null>(null)
async function confirmRemoveMember() {
  if (!removeMemberTarget.value || !authStore.familyId) return
  await familyMembersStore.removeMember(authStore.familyId, removeMemberTarget.value.uid)
  removeMemberTarget.value = null
}

// Narrower than RegisterView's full list — this dialog exists specifically
// so an owner can declare themselves a parent and unlock family-member
// management (see firestore.rules), not as a general "fix your relation"
// tool for every possible role.
const EDIT_PROFILE_RELATIONS: FamilyRelation[] = ['mother', 'father']
const showEditProfile = ref(false)
const editName = ref('')
const editRelation = ref<FamilyRelation | null>(null)
function openEditProfile() {
  editName.value = authStore.profile?.name ?? ''
  editRelation.value = authStore.profile?.relation ?? null
  showEditProfile.value = true
}
async function saveProfile() {
  await authStore.updateProfile({
    name: editName.value.trim() || undefined,
    relation: editRelation.value || undefined,
  })
  showEditProfile.value = false
}

async function clearAll() {
  await Promise.all([
    feverLogStore.clearAllEntries(),
    feedingLogStore.clearAllEntries(),
    growthLogStore.clearAllEntries(),
    symptomLogStore.clearAllEntries(),
    sleepLogStore.clearAllEntries(),
    diaperLogStore.clearAllEntries(),
    calendarEventsStore.clearAllEntries(),
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

    <v-btn
      block
      height="64"
      color="error"
      variant="flat"
      rounded="lg"
      class="mb-6"
      @click="showEmergencyConfirm = true"
    >
      <div class="d-flex align-center w-100">
        <v-icon icon="mdi-phone-alert" size="26" class="mr-3" />
        <span class="text-body-1 font-weight-bold">{{ t('home.emergency.button') }}</span>
      </div>
    </v-btn>

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
          <span v-if="authStore.profile?.relation" class="text-medium-emphasis font-weight-regular">
            · {{ t(`auth.register.relations.${authStore.profile.relation}`) }}</span
          >
        </div>
        <div class="text-body-2 text-medium-emphasis">{{ authStore.profile?.email }}</div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="openEditProfile">{{ t('settings.editProfile') }}</v-btn>
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
        <template v-if="familyMembersStore.members.length">
          <p class="text-caption text-medium-emphasis text-uppercase mb-1">
            {{ t('settings.membersTitle') }}
          </p>
          <v-list density="compact" class="mb-4 pa-0">
            <v-list-item v-for="member in familyMembersStore.members" :key="member.uid" class="px-0">
              <template #prepend>
                <v-avatar color="primary" size="32" class="mr-3">
                  <span class="text-body-2 text-white">{{
                    (member.name || member.email || '?').charAt(0).toUpperCase()
                  }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2 font-weight-bold">
                {{ member.name || member.email }}
                <span v-if="member.relation" class="text-medium-emphasis font-weight-regular">
                  · {{ t(`auth.register.relations.${member.relation}`) }}</span
                >
                <span v-if="member.isSelf" class="text-medium-emphasis font-weight-regular">
                  ({{ t('settings.you') }})</span
                >
              </v-list-item-title>
              <v-list-item-subtitle v-if="member.name && member.email" class="text-caption">{{
                member.email
              }}</v-list-item-subtitle>
              <template #append>
                <v-btn
                  v-if="!member.isSelf && isFamilyOwner"
                  icon="mdi-account-remove-outline"
                  variant="text"
                  size="small"
                  :aria-label="t('settings.removeMemberAria')"
                  @click="
                    removeMemberTarget = { uid: member.uid, label: member.name || member.email || '' }
                  "
                />
              </template>
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

    <v-dialog :model-value="!!removeMemberTarget" max-width="360">
      <v-card>
        <v-card-title class="text-h6">{{ t('settings.removeMemberConfirmTitle') }}</v-card-title>
        <v-card-text>{{
          t('settings.removeMemberConfirmBody', { name: removeMemberTarget?.label ?? '' })
        }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="removeMemberTarget = null">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="confirmRemoveMember">{{
            t('common.delete')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEditProfile" max-width="360">
      <v-card>
        <v-card-title class="text-h6">{{ t('settings.editProfile') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editName"
            :label="t('auth.register.nameLabel')"
            variant="outlined"
            density="comfortable"
          />
          <v-select
            v-model="editRelation"
            :items="
              EDIT_PROFILE_RELATIONS.map((r) => ({ value: r, title: t(`auth.register.relations.${r}`) }))
            "
            :label="t('auth.register.relationLabel')"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEditProfile = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveProfile">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEmergencyConfirm" max-width="360">
      <v-card>
        <v-card-title class="text-h6">{{ t('home.emergency.confirmTitle') }}</v-card-title>
        <v-card-text>{{ t('home.emergency.confirmBody') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEmergencyConfirm = false">{{
            t('common.cancel')
          }}</v-btn>
          <v-btn color="error" variant="flat" @click="confirmEmergency">{{
            t('home.emergency.confirmAction')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
