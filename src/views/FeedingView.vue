<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { deleteField } from 'firebase/firestore'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useChildrenStore } from '@/stores/children'
import { useAuthStore } from '@/stores/auth'
import AddBreastfeedingDialog from '@/components/AddBreastfeedingDialog.vue'
import AddBottleDialog from '@/components/AddBottleDialog.vue'
import AddSolidFoodDialog from '@/components/AddSolidFoodDialog.vue'
import FeedingTimelineList from '@/components/FeedingTimelineList.vue'

const { t } = useI18n()
const store = useFeedingLogStore()
const childrenStore = useChildrenStore()
const authStore = useAuthStore()

const showBreastfeedingDialog = ref(false)
const showBottleDialog = ref(false)
const showSolidFoodDialog = ref(false)

const recent = computed(() => store.recentEntries(48))

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === store.activeChildId) ?? null,
)

// A local draft plus an explicit Kaydet/Sil pair, rather than saving on
// every keystroke — typing "3" used to write to Firestore after every
// digit with no feedback that anything had happened, which read as
// "nothing I do here does anything."
const feedingReminderInput = ref<number | null>(null)
watch(
  activeChild,
  (child) => {
    feedingReminderInput.value = child?.feedingReminderIntervalHours ?? null
  },
  { immediate: true },
)

function saveFeedingReminder(hours: number | null) {
  if (!authStore.familyId || !activeChild.value) return
  childrenStore.updateChild(authStore.familyId, activeChild.value.id, {
    feedingReminderIntervalHours: hours && hours > 0 ? hours : deleteField(),
  })
}

function clearFeedingReminder() {
  feedingReminderInput.value = null
  saveFeedingReminder(null)
}
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

    <v-card v-if="activeChild" variant="outlined" class="mb-6 pa-2">
      <v-card-text class="py-2">
        <v-text-field
          v-model.number="feedingReminderInput"
          type="number"
          min="0"
          :label="t('feeding.reminderLabel')"
          :hint="t('feeding.reminderHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn
          v-if="activeChild.feedingReminderIntervalHours"
          variant="text"
          color="error"
          size="small"
          @click="clearFeedingReminder"
        >
          {{ t('common.delete') }}
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          @click="saveFeedingReminder(feedingReminderInput)"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <template v-if="recent.length">
      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">{{ t('feeding.last48h') }}</span>
      </div>
      <FeedingTimelineList :entries="recent" />
    </template>

    <AddBreastfeedingDialog v-model="showBreastfeedingDialog" />
    <AddBottleDialog v-model="showBottleDialog" />
    <AddSolidFoodDialog v-model="showSolidFoodDialog" />
  </v-container>
</template>
