<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import type { Child } from '@/types/family'

const authStore = useAuthStore()
const childrenStore = useChildrenStore()

const showDialog = ref(false)
const editingChild = ref<Child | null>(null)
const name = ref('')
const birthDate = ref('')
const confirmDeleteTarget = ref<Child | null>(null)

function openAdd() {
  editingChild.value = null
  name.value = ''
  birthDate.value = ''
  showDialog.value = true
}

function openEdit(child: Child) {
  editingChild.value = child
  name.value = child.name
  birthDate.value = child.birthDate ?? ''
  showDialog.value = true
}

async function save() {
  if (!name.value.trim() || !authStore.familyId) return
  const data = { name: name.value.trim(), ...(birthDate.value ? { birthDate: birthDate.value } : {}) }
  if (editingChild.value) {
    await childrenStore.updateChild(authStore.familyId, editingChild.value.id, data)
  } else {
    await childrenStore.addChild(authStore.familyId, data)
  }
  showDialog.value = false
}

async function confirmDelete() {
  if (confirmDeleteTarget.value && authStore.familyId) {
    await childrenStore.removeChild(authStore.familyId, confirmDeleteTarget.value.id)
  }
  confirmDeleteTarget.value = null
}

function ageLabel(birthDate?: string) {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months--
  if (months < 24) return `${Math.max(months, 0)} aylık`
  return `${Math.floor(months / 12)} yaşında`
}
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" to="/" aria-label="Geri" />
      <span class="text-h6 ml-2">Çocuklarım</span>
    </div>

    <v-list v-if="childrenStore.children.length" lines="two" class="mb-4">
      <v-list-item v-for="child in childrenStore.children" :key="child.id" @click="openEdit(child)">
        <template #prepend>
          <v-avatar color="primary" variant="tonal">
            <v-icon icon="mdi-baby-face-outline" />
          </v-avatar>
        </template>
        <v-list-item-title>{{ child.name }}</v-list-item-title>
        <v-list-item-subtitle v-if="child.birthDate">{{ ageLabel(child.birthDate) }}</v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            aria-label="Çocuğu sil"
            @click.stop="confirmDeleteTarget = child"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">Henüz çocuk eklenmedi.</div>

    <v-btn block size="large" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openAdd">
      Çocuk Ekle
    </v-btn>

    <v-dialog v-model="showDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">{{ editingChild ? 'Çocuğu Düzenle' : 'Çocuk Ekle' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="name" label="Adı" variant="outlined" density="comfortable" autofocus />
          <v-text-field
            v-model="birthDate"
            type="date"
            label="Doğum tarihi (opsiyonel)"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">Vazgeç</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!name.trim()" @click="save">Kaydet</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!confirmDeleteTarget"
      max-width="360"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
    >
      <v-card v-if="confirmDeleteTarget">
        <v-card-title class="text-h6">Çocuğu sil</v-card-title>
        <v-card-text>
          {{ confirmDeleteTarget.name }} ve tüm ateş/ilaç kayıtları kalıcı olarak silinecek. Emin misin?
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
