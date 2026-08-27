<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDutyPharmacies } from '@/composables/useDutyPharmacies'

const { t } = useI18n()
const { loading, error, pharmacies, locationLabel, load } = useDutyPharmacies()

onMounted(load)

function mapsUrl(loc: string): string {
  const [lat, lng] = loc.split(',')
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

function telUrl(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`
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
      <span class="text-h6 ml-2">{{ t('dutyPharmacy.title') }}</span>
    </div>

    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="pharmacy" class="mb-4" />
      <div class="text-body-2 text-medium-emphasis">{{ t('dutyPharmacy.loading') }}</div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <v-icon icon="mdi-map-marker-off-outline" size="48" color="medium-emphasis" class="mb-4" />
      <p class="text-body-2 text-medium-emphasis mb-4">{{ t(`dutyPharmacy.errors.${error}`) }}</p>
      <v-btn color="pharmacy" variant="tonal" prepend-icon="mdi-refresh" @click="load">{{
        t('dutyPharmacy.retry')
      }}</v-btn>
    </div>

    <template v-else>
      <p v-if="locationLabel" class="text-body-2 text-medium-emphasis mb-4">
        {{ t('dutyPharmacy.nearLabel', { location: locationLabel }) }}
      </p>

      <div v-if="!pharmacies.length" class="text-center text-medium-emphasis py-8">
        {{ t('dutyPharmacy.empty') }}
      </div>

      <v-list v-else lines="three" class="mb-2">
        <v-list-item v-for="(pharmacy, i) in pharmacies" :key="i">
          <template #prepend>
            <v-avatar color="pharmacy" variant="tonal">
              <v-icon icon="mdi-mortar-pestle" />
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-bold">{{ pharmacy.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ pharmacy.dist }} — {{ pharmacy.address }}</v-list-item-subtitle>
          <template #append>
            <div class="d-flex flex-column ga-1">
              <v-btn icon="mdi-phone" size="small" variant="text" color="pharmacy" :href="telUrl(pharmacy.phone)" :aria-label="t('dutyPharmacy.callAria')" />
              <v-btn icon="mdi-map-marker-outline" size="small" variant="text" color="pharmacy" :href="mapsUrl(pharmacy.loc)" target="_blank" rel="noopener" :aria-label="t('dutyPharmacy.mapAria')" />
            </div>
          </template>
        </v-list-item>
      </v-list>

      <v-btn block variant="tonal" color="pharmacy" prepend-icon="mdi-refresh" @click="load">{{
        t('dutyPharmacy.retry')
      }}</v-btn>
    </template>
  </v-container>
</template>
