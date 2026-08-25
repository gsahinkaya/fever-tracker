<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFeedingLogStore } from '@/stores/feedingLog'
import AddBreastfeedingDialog from '@/components/AddBreastfeedingDialog.vue'
import AddBottleDialog from '@/components/AddBottleDialog.vue'
import AddSolidFoodDialog from '@/components/AddSolidFoodDialog.vue'
import FeedingTimelineList from '@/components/FeedingTimelineList.vue'

const store = useFeedingLogStore()

const showBreastfeedingDialog = ref(false)
const showBottleDialog = ref(false)
const showSolidFoodDialog = ref(false)

const recent = computed(() => store.recentEntries(48))
</script>

<template>
  <v-container class="py-4" style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" to="/" aria-label="Geri" />
      <span class="text-h6 ml-2">Beslenme</span>
    </div>

    <v-row class="mb-2" dense>
      <v-col cols="4">
        <v-btn
          block
          size="large"
          color="secondary"
          variant="tonal"
          class="py-6"
          @click="showBreastfeedingDialog = true"
        >
          <div class="d-flex flex-column align-center">
            <v-icon icon="mdi-mother-nurse" size="28" class="mb-1" />
            <span class="text-caption">Emzirme</span>
          </div>
        </v-btn>
      </v-col>
      <v-col cols="4">
        <v-btn
          block
          size="large"
          color="primary"
          variant="tonal"
          class="py-6"
          @click="showBottleDialog = true"
        >
          <div class="d-flex flex-column align-center">
            <v-icon icon="mdi-baby-bottle-outline" size="28" class="mb-1" />
            <span class="text-caption">Biberon</span>
          </div>
        </v-btn>
      </v-col>
      <v-col cols="4">
        <v-btn
          block
          size="large"
          color="success"
          variant="tonal"
          class="py-6"
          @click="showSolidFoodDialog = true"
        >
          <div class="d-flex flex-column align-center">
            <v-icon icon="mdi-food-apple-outline" size="28" class="mb-1" />
            <span class="text-caption">Katı Gıda</span>
          </div>
        </v-btn>
      </v-col>
    </v-row>

    <div class="d-flex align-center justify-space-between mb-2 mt-4">
      <span class="text-subtitle-2 text-medium-emphasis">Son 48 Saat</span>
    </div>
    <v-card variant="outlined">
      <FeedingTimelineList :entries="recent" />
    </v-card>

    <AddBreastfeedingDialog v-model="showBreastfeedingDialog" />
    <AddBottleDialog v-model="showBottleDialog" />
    <AddSolidFoodDialog v-model="showSolidFoodDialog" />
  </v-container>
</template>
