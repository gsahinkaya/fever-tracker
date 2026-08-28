<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useGrowthLogStore } from '@/stores/growthLog'
import { ageLabel } from '@/lib/age'
import type { Child } from '@/types/family'

const { t } = useI18n()
const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const growthLogStore = useGrowthLogStore()

const showDialog = ref(false)
const editingChild = ref<Child | null>(null)
const name = ref('')
const birthDate = ref('')
const gender = ref<Child['gender'] | null>(null)
const heightCm = ref<number | null>(null)
const weightKg = ref<number | null>(null)
const headCircumferenceCm = ref<number | null>(null)
const confirmDeleteTarget = ref<Child | null>(null)

function openAdd() {
  editingChild.value = null
  name.value = ''
  birthDate.value = ''
  gender.value = null
  heightCm.value = null
  weightKg.value = null
  headCircumferenceCm.value = null
  showDialog.value = true
}

function openEdit(child: Child) {
  editingChild.value = child
  name.value = child.name
  birthDate.value = child.birthDate ?? ''
  gender.value = child.gender ?? null
  heightCm.value = child.heightCm ?? null
  weightKg.value = child.weightKg ?? null
  headCircumferenceCm.value = child.headCircumferenceCm ?? null
  showDialog.value = true
}

async function save() {
  if (!name.value.trim() || !authStore.familyId) return
  const data = {
    name: name.value.trim(),
    ...(birthDate.value ? { birthDate: birthDate.value } : {}),
    ...(gender.value ? { gender: gender.value } : {}),
    ...(heightCm.value ? { heightCm: heightCm.value } : {}),
    ...(weightKg.value ? { weightKg: weightKg.value } : {}),
    ...(headCircumferenceCm.value ? { headCircumferenceCm: headCircumferenceCm.value } : {}),
  }
  const childId = editingChild.value
    ? editingChild.value.id
    : await childrenStore.addChild(authStore.familyId, data)
  if (editingChild.value) {
    await childrenStore.updateChild(authStore.familyId, childId, data)
  }
  // Keep Büyüme in sync with whatever height/weight/head circumference was
  // entered here — on first creation (no history yet) and on every later
  // edit that actually changes a number (a real updated measurement), but
  // not on a save that only touched the name/birthdate and left these
  // fields as-is (see syncEntryFromProfile).
  if (heightCm.value || weightKg.value || headCircumferenceCm.value) {
    await growthLogStore.syncEntryFromProfile(
      authStore.familyId,
      childId,
      heightCm.value ?? undefined,
      weightKg.value ?? undefined,
      headCircumferenceCm.value ?? undefined,
    )
  }
  showDialog.value = false
}

async function confirmDelete() {
  if (confirmDeleteTarget.value && authStore.familyId) {
    await childrenStore.removeChild(authStore.familyId, confirmDeleteTarget.value.id)
  }
  confirmDeleteTarget.value = null
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
      <span class="text-h6 ml-2">{{ t('children.title') }}</span>
    </div>

    <div v-if="childrenStore.loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>
    <v-list v-else-if="childrenStore.children.length" lines="two" class="mb-4">
      <v-list-item v-for="child in childrenStore.children" :key="child.id" @click="openEdit(child)">
        <template #prepend>
          <v-avatar color="primary" variant="tonal">
            <v-icon icon="mdi-baby-face-outline" />
          </v-avatar>
        </template>
        <v-list-item-title>{{ child.name }}</v-list-item-title>
        <v-list-item-subtitle v-if="child.birthDate">{{
          ageLabel(child.birthDate)
        }}</v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            :aria-label="t('children.deleteAria')"
            @click.stop="confirmDeleteTarget = child"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">{{ t('children.empty') }}</div>

    <v-btn
      block
      size="large"
      color="primary"
      variant="tonal"
      prepend-icon="mdi-plus"
      @click="openAdd"
    >
      {{ t('children.addButton') }}
    </v-btn>

    <v-dialog v-model="showDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">{{
          editingChild ? t('children.dialog.editTitle') : t('children.dialog.addTitle')
        }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="name"
            :label="t('children.dialog.nameLabel')"
            variant="outlined"
            density="comfortable"
            autofocus
          />
          <v-text-field
            v-model="birthDate"
            type="date"
            :label="t('children.dialog.birthDateLabel')"
            variant="outlined"
            density="comfortable"
          />
          <v-radio-group v-model="gender" density="comfortable" inline hide-details class="mb-2">
            <template #label>
              <span class="text-body-2">{{ t('children.dialog.genderLabel') }}</span>
            </template>
            <v-radio :label="t('children.dialog.female')" value="female" />
            <v-radio :label="t('children.dialog.male')" value="male" />
          </v-radio-group>
          <div class="d-flex ga-2">
            <v-text-field
              v-model.number="heightCm"
              type="number"
              :label="t('children.dialog.heightLabel')"
              variant="outlined"
              density="comfortable"
            />
            <v-text-field
              v-model.number="weightKg"
              type="number"
              :label="t('children.dialog.weightLabel')"
              variant="outlined"
              density="comfortable"
            />
          </div>
          <v-text-field
            v-model.number="headCircumferenceCm"
            type="number"
            :label="t('children.dialog.headCircumferenceLabel')"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!name.trim()" @click="save">{{
            t('common.save')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!confirmDeleteTarget"
      max-width="360"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
    >
      <v-card v-if="confirmDeleteTarget">
        <v-card-title class="text-h6">{{ t('children.deleteConfirm.title') }}</v-card-title>
        <v-card-text>
          {{ t('children.deleteConfirm.body', { name: confirmDeleteTarget.name }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDeleteTarget = null">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">{{
            t('common.delete')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
