<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedingLogStore } from '@/stores/feedingLog'
import AddBreastfeedingDialog from '@/components/AddBreastfeedingDialog.vue'
import AddBottleDialog from '@/components/AddBottleDialog.vue'
import AddSolidFoodDialog from '@/components/AddSolidFoodDialog.vue'
import FeedingTimelineList from '@/components/FeedingTimelineList.vue'

const { t } = useI18n()
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
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('feeding.title') }}</span>
    </div>

    <div class="d-flex flex-column mb-6" style="gap: 12px">
      <v-btn
        block
        height="64"
        color="secondary"
        variant="flat"
        rounded="lg"
        @click="showBreastfeedingDialog = true"
      >
        <div class="d-flex align-center w-100">
          <v-icon icon="mdi-mother-nurse" size="26" class="mr-3" />
          <span class="text-body-1 font-weight-bold">{{ t('feeding.tiles.breastfeeding') }}</span>
        </div>
      </v-btn>
      <v-btn
        block
        height="64"
        color="primary"
        variant="flat"
        rounded="lg"
        @click="showBottleDialog = true"
      >
        <div class="d-flex align-center w-100">
          <v-icon icon="mdi-baby-bottle-outline" size="26" class="mr-3" />
          <span class="text-body-1 font-weight-bold">{{ t('feeding.tiles.bottle') }}</span>
        </div>
      </v-btn>
      <v-btn
        block
        height="64"
        color="success"
        variant="flat"
        rounded="lg"
        @click="showSolidFoodDialog = true"
      >
        <div class="d-flex align-center w-100">
          <v-icon icon="mdi-food-apple-outline" size="26" class="mr-3" />
          <span class="text-body-1 font-weight-bold">{{ t('feeding.tiles.solid') }}</span>
        </div>
      </v-btn>
    </div>

    <template v-if="recent.length">
      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">{{ t('feeding.last48h') }}</span>
      </div>
      <v-card variant="outlined">
        <FeedingTimelineList :entries="recent" />
      </v-card>
    </template>

    <AddBreastfeedingDialog v-model="showBreastfeedingDialog" />
    <AddBottleDialog v-model="showBottleDialog" />
    <AddSolidFoodDialog v-model="showSolidFoodDialog" />
  </v-container>
</template>
