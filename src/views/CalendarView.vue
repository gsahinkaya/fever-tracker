<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCalendarEventsStore } from '@/stores/calendarEvents'
import { useFamilyMembersStore } from '@/stores/familyMembers'
import AddCalendarEventDialog from '@/components/AddCalendarEventDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { whoNameLabel } from '@/lib/describeActivity'
import { plainDate, todayDateString } from '@/lib/dateFormat'
import { downloadCalendarEventIcs } from '@/lib/ics'
import type { CalendarEvent } from '@/types/health'

const { t } = useI18n()
const store = useCalendarEventsStore()
const familyMembersStore = useFamilyMembersStore()

const showAddDialog = ref(false)
const confirmDeleteTarget = ref<CalendarEvent | null>(null)

// store.events is already ordered ascending by date (see the Firestore
// query in stores/calendarEvents.ts) — same-day events aren't ordered by
// time there (Firestore would need a composite index for a second orderBy
// field), so that tie-break happens here instead.
function byTime(a: CalendarEvent, b: CalendarEvent) {
  return (a.time ?? '').localeCompare(b.time ?? '')
}
const today = todayDateString()
const upcoming = computed(() => store.events.filter((e) => e.date >= today).sort(byTime))
const past = computed(() =>
  store.events
    .filter((e) => e.date < today)
    .sort(byTime)
    .reverse(),
)

function eventDateLabel(event: CalendarEvent): string {
  return event.time ? `${plainDate(event.date)} ${event.time}` : plainDate(event.date)
}

const deleteBody = computed(() =>
  confirmDeleteTarget.value
    ? t('calendar.deleteConfirmBody', {
        title: confirmDeleteTarget.value.title,
        date: plainDate(confirmDeleteTarget.value.date),
      })
    : '',
)

function confirmDelete() {
  if (confirmDeleteTarget.value) store.removeEntry(confirmDeleteTarget.value.id)
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
      <span class="text-h6 ml-2">{{ t('calendar.title') }}</span>
    </div>

    <v-btn
      block
      height="64"
      color="calendar"
      variant="flat"
      rounded="lg"
      class="mb-6"
      @click="showAddDialog = true"
    >
      <div class="d-flex align-center w-100">
        <v-icon icon="mdi-calendar-plus" size="26" class="mr-3" />
        <span class="text-body-1 font-weight-bold">{{ t('calendar.addButton') }}</span>
      </div>
    </v-btn>

    <template v-if="!store.events.length">
      <div class="text-center text-medium-emphasis py-8">{{ t('calendar.empty') }}</div>
    </template>

    <template v-else>
      <p v-if="upcoming.length" class="text-subtitle-2 text-medium-emphasis mb-2">{{
        t('calendar.upcoming')
      }}</p>
      <v-list v-if="upcoming.length" lines="two" class="mb-4">
        <v-list-item v-for="event in upcoming" :key="event.id">
          <template #prepend>
            <v-avatar color="calendar" variant="tonal">
              <v-icon icon="mdi-calendar-heart" />
            </v-avatar>
          </template>
          <v-list-item-title
            >{{ event.title }}<span v-if="event.note"> · {{ event.note }}</span></v-list-item-title
          >
          <v-list-item-subtitle
            >{{ eventDateLabel(event) }} ·
            {{
              whoNameLabel(familyMembersStore.members, event.createdBy, event.createdByEmail)
            }}</v-list-item-subtitle
          >
          <template #append>
            <v-btn
              icon="mdi-calendar-export-outline"
              variant="text"
              size="small"
              :aria-label="t('calendar.addToPhoneCalendar')"
              @click="downloadCalendarEventIcs(event)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              :aria-label="t('calendar.deleteAria')"
              @click="confirmDeleteTarget = event"
            />
          </template>
        </v-list-item>
      </v-list>

      <template v-if="past.length">
        <p class="text-subtitle-2 text-medium-emphasis mb-2">{{ t('calendar.past') }}</p>
        <v-list lines="two">
          <v-list-item v-for="event in past" :key="event.id" class="text-medium-emphasis">
            <template #prepend>
              <v-avatar color="calendar" variant="tonal">
                <v-icon icon="mdi-calendar-heart" />
              </v-avatar>
            </template>
            <v-list-item-title
              >{{ event.title }}<span v-if="event.note"> · {{ event.note }}</span></v-list-item-title
            >
            <v-list-item-subtitle
              >{{ eventDateLabel(event) }} ·
              {{
                whoNameLabel(familyMembersStore.members, event.createdBy, event.createdByEmail)
              }}</v-list-item-subtitle
            >
            <template #append>
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                :aria-label="t('calendar.deleteAria')"
                @click="confirmDeleteTarget = event"
              />
            </template>
          </v-list-item>
        </v-list>
      </template>
    </template>

    <AddCalendarEventDialog v-model="showAddDialog" />

    <ConfirmDialog
      :model-value="!!confirmDeleteTarget"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
      :title="t('calendar.deleteConfirmTitle')"
      :body="deleteBody"
      @confirm="confirmDelete"
    />
  </v-container>
</template>
