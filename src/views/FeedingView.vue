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
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        aria-label="Geri"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">Beslenme</span>
    </div>

    <v-row class="mb-2">
      <v-col cols="4">
        <v-btn
          block
          color="secondary"
          variant="flat"
          style="aspect-ratio: 1 / 1; height: auto"
          @click="showBreastfeedingDialog = true"
        >
          <div class="d-flex flex-column align-center">
            <v-icon icon="mdi-mother-nurse" size="34" class="mb-2" />
            <span class="text-body-2 font-weight-bold">Emzirme</span>
          </div>
        </v-btn>
      </v-col>
      <v-col cols="4">
        <v-btn
          block
          color="primary"
          variant="flat"
          style="aspect-ratio: 1 / 1; height: auto"
          @click="showBottleDialog = true"
        >
          <div class="d-flex flex-column align-center">
            <v-icon icon="mdi-baby-bottle-outline" size="34" class="mb-2" />
            <span class="text-body-2 font-weight-bold">Biberon</span>
          </div>
        </v-btn>
      </v-col>
      <v-col cols="4">
        <v-btn
          block
          color="success"
          variant="flat"
          style="aspect-ratio: 1 / 1; height: auto"
          @click="showSolidFoodDialog = true"
        >
          <div class="d-flex flex-column align-center">
            <v-icon icon="mdi-food-apple-outline" size="34" class="mb-2" />
            <span class="text-body-2 font-weight-bold">Katı Gıda</span>
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
