<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import type { Medication } from '@/types/health'

const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const feverLogStore = useFeverLogStore()
const medicationsStore = useMedicationsStore()

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId) ?? null,
)

const showDialog = ref(false)
const editingMedication = ref<Medication | null>(null)
const name = ref('')
const minIntervalHours = ref<number | null>(null)
const note = ref('')
const confirmDeleteTarget = ref<Medication | null>(null)

function openAdd() {
  editingMedication.value = null
  name.value = ''
  minIntervalHours.value = null
  note.value = ''
  showDialog.value = true
}

function openEdit(medication: Medication) {
  editingMedication.value = medication
  name.value = medication.name
  minIntervalHours.value = medication.minIntervalHours
  note.value = medication.note ?? ''
  showDialog.value = true
}

async function save() {
  if (!name.value.trim() || !minIntervalHours.value || minIntervalHours.value <= 0) return
  if (!authStore.familyId || !feverLogStore.activeChildId) return

  const data = {
    name: name.value.trim(),
    minIntervalHours: minIntervalHours.value,
    ...(note.value.trim() ? { note: note.value.trim() } : {}),
  }

  if (editingMedication.value) {
    await medicationsStore.updateMedication(
      authStore.familyId,
      feverLogStore.activeChildId,
      editingMedication.value.id,
      data,
    )
  } else {
    await medicationsStore.addMedication(authStore.familyId, feverLogStore.activeChildId, data)
  }
  showDialog.value = false
}

async function confirmDelete() {
  if (confirmDeleteTarget.value && authStore.familyId && feverLogStore.activeChildId) {
    await medicationsStore.removeMedication(
      authStore.familyId,
      feverLogStore.activeChildId,
      confirmDeleteTarget.value.id,
    )
  }
  confirmDeleteTarget.value = null
}
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-2">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        aria-label="Geri"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">İlaçlarım</span>
    </div>
    <p v-if="activeChild" class="text-body-2 text-medium-emphasis mb-4">
      {{ activeChild.name }} için tanımlı ilaçlar. Her ilacın adını ve iki doz arasında beklenmesi
      gereken süreyi sen belirlersin.
    </p>

    <v-list v-if="medicationsStore.medications.length" lines="two" class="mb-4">
      <v-list-item v-for="med in medicationsStore.medications" :key="med.id" @click="openEdit(med)">
        <template #prepend>
          <v-avatar color="primary" variant="tonal">
            <v-icon icon="mdi-pill" />
          </v-avatar>
        </template>
        <v-list-item-title>{{ med.name }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ med.minIntervalHours }} saatte bir güvenli<span v-if="med.note">
            · {{ med.note }}</span
          >
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            aria-label="İlacı sil"
            @click.stop="confirmDeleteTarget = med"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">Henüz ilaç eklenmedi.</div>

    <v-btn
      block
      size="large"
      color="primary"
      variant="tonal"
      prepend-icon="mdi-plus"
      @click="openAdd"
    >
      İlaç Ekle
    </v-btn>

    <v-dialog v-model="showDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">{{
          editingMedication ? 'İlacı Düzenle' : 'İlaç Ekle'
        }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="name"
            label="İlaç adı"
            placeholder="Örn. Calpol şurup"
            variant="outlined"
            density="comfortable"
            autofocus
          />
          <v-text-field
            v-model.number="minIntervalHours"
            type="number"
            label="Kaç saatte bir güvenli?"
            placeholder="Örn. 4"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="note"
            label="Not (opsiyonel)"
            placeholder="Örn. 5 ml, yemekten sonra"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">Vazgeç</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!name.trim() || !minIntervalHours"
            @click="save"
          >
            Kaydet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!confirmDeleteTarget"
      max-width="360"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
    >
      <v-card v-if="confirmDeleteTarget">
        <v-card-title class="text-h6">İlacı sil</v-card-title>
        <v-card-text>
          {{ confirmDeleteTarget.name }} silinecek. Geçmiş kayıtlar etkilenmez, sadece yeni doz
          girişinde bu ilaç artık seçilemez.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDeleteTarget = null">Vazgeç</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Sil</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
